#!/usr/bin/env python3
"""Reconnaissance des visages pour la sonnette (Home Assistant).

Service HTTP local, sans AVX : OpenCV + YuNet (détection) + SFace (reconnaissance).

  GET  /                           galerie : visages à identifier, personnes connues
  GET  /sante                      état du service
  POST /analyser   {"camera": ..}  prend des photos de la caméra et dit qui est là
  POST /apprendre  {"nom": ..}     enregistre le visage visible maintenant pour cette personne
  POST /nommer     {"fichier"|"dernier", "nom"}  range un visage inconnu chez une personne
  POST /supprimer  {"fichier"}     supprime un visage (inconnu ou photo de référence)
  POST /recharger                  relit le dossier des personnes
  GET  /derniere.jpg               dernière photo analysée, visages encadrés
  GET  /visage.jpg                 dernier visage inconnu (pour les notifications)

Dossiers (sous BASE) :
  personnes/<nom>/*.jpg   photos de référence (une personne par sous-dossier)
  inconnus/               visages non reconnus, à identifier depuis la galerie
  captures/               dernières photos analysées avec des visages
"""
import glob
import html
import json
import os
import re
import threading
import time
import unicodedata
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, quote

import cv2
import numpy as np

BASE = os.environ.get('VISAGES_BASE', '/opt/visages')
HA_URL = os.environ.get('HA_URL', 'http://192.168.86.11').rstrip('/')
HA_TOKEN = os.environ.get('HA_TOKEN', '')
CAMERA = os.environ.get('CAMERA', 'camera.sonnette')
API_TOKEN = os.environ.get('API_TOKEN', '')
SEUIL = float(os.environ.get('SEUIL', '0.40'))        # similarité cosinus SFace (0.363 = seuil de référence)
SUGGESTION = float(os.environ.get('SUGGESTION', '0.28'))
DOUBLON = float(os.environ.get('DOUBLON', '0.55'))    # même inconnu déjà gardé récemment
TAILLE_MIN = int(os.environ.get('TAILLE_MIN', '40'))  # px : visages plus petits ignorés
PORT = int(os.environ.get('PORT', '8099'))
TENTATIVES = int(os.environ.get('TENTATIVES', '4'))
GARDER = 300
GARDER_INCONNUS = 600

DOSSIER_P = os.path.join(BASE, 'personnes')
DOSSIER_I = os.path.join(BASE, 'inconnus')
DOSSIER_C = os.path.join(BASE, 'captures')
for d in (DOSSIER_P, DOSSIER_I, DOSSIER_C):
    os.makedirs(d, exist_ok=True)

detecteur = cv2.FaceDetectorYN.create(os.path.join(BASE, 'modeles', 'yunet.onnx'), '', (320, 320), 0.8, 0.3, 5000)
reconnaisseur = cv2.FaceRecognizerSF.create(os.path.join(BASE, 'modeles', 'sface.onnx'), '')
verrou = threading.Lock()
connus = {}      # nom -> liste d'empreintes
inconnus = {}    # fichier -> (empreinte, horodatage)
derniere = None
dernier_inconnu = None   # nom de fichier


def slug(nom):
    s = unicodedata.normalize('NFKD', nom).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-') or 'inconnu'


def joli(nom):
    return nom.replace('-', ' ').title()


def reduire(img, maxi=1280):
    h, w = img.shape[:2]
    if max(h, w) > maxi:
        f = maxi / max(h, w)
        img = cv2.resize(img, (int(w * f), int(h * f)))
    return img


def visages(img):
    h, w = img.shape[:2]
    with verrou:
        detecteur.setInputSize((w, h))
        _, faces = detecteur.detect(img)
    if faces is None:
        return []
    return sorted(faces, key=lambda f: -(f[2] * f[3]))


def empreinte(img, face):
    with verrou:
        return reconnaisseur.feature(reconnaisseur.alignCrop(img, face)).flatten()


def similarite(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


def recadrer(img, face, marge=0.6):
    x, y, w, h = [int(v) for v in face[:4]]
    m = int(max(w, h) * marge)
    return img[max(0, y - m):y + h + m, max(0, x - m):x + w + m]


def emb_fichier(f):
    img = cv2.imread(f)
    if img is None:
        return None
    fs = visages(reduire(img))
    return empreinte(reduire(img), fs[0]) if fs else None


def charger():
    global connus
    nouveau = {}
    for dossier in sorted(glob.glob(os.path.join(DOSSIER_P, '*'))):
        if not os.path.isdir(dossier):
            continue
        embs = [e for e in (emb_fichier(f) for f in sorted(glob.glob(os.path.join(dossier, '*.jpg')))) if e is not None]
        if embs:
            nouveau[os.path.basename(dossier)] = embs
    connus = nouveau
    return {n: len(e) for n, e in connus.items()}


def charger_inconnus():
    for f in sorted(glob.glob(os.path.join(DOSSIER_I, '*.jpg'))):
        e = emb_fichier(f)
        if e is not None:
            inconnus[os.path.basename(f)] = (e, os.path.getmtime(f))


def meilleur(emb):
    best, score = None, -1.0
    for nom, embs in connus.items():
        s = max(similarite(emb, e) for e in embs)
        if s > score:
            best, score = nom, s
    return best, score


def identifier(emb):
    nom, score = meilleur(emb)
    return (nom, score) if score >= SEUIL else (None, score)


def photo_camera(camera):
    req = urllib.request.Request(HA_URL + '/api/camera_proxy/' + camera,
                                 headers={'Authorization': 'Bearer ' + HA_TOKEN})
    with urllib.request.urlopen(req, timeout=10) as r:
        data = r.read()
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError('image illisible')
    return reduire(img)


def photo_url(url):
    """Photo d'un événement Netatmo (instantané ou vignette), adresse signée *.netatmo.net uniquement."""
    hote = urlparse(url).hostname or ''
    if urlparse(url).scheme != 'https' or not (hote == 'netatmo.net' or hote.endswith('.netatmo.net') or hote.endswith('.netatmo.com')):
        raise ValueError('adresse refusée')
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'visages'}), timeout=10) as r:
        data = r.read()
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError('image illisible')
    return img


def nettoyer(dossier, garder):
    for f in sorted(glob.glob(os.path.join(dossier, '*.jpg')))[:-garder]:
        try:
            os.remove(f)
            inconnus.pop(os.path.basename(f), None)
        except OSError:
            pass


def garder_inconnu(img, face, emb, camera):
    """Range un visage inconnu pour la galerie, sauf s'il vient d'être gardé."""
    global dernier_inconnu
    maintenant = time.time()
    for f, (e, t) in list(inconnus.items()):
        if maintenant - t < 900 and similarite(emb, e) >= DOUBLON:
            dernier_inconnu = f
            return f
    nom = time.strftime('%Y%m%d-%H%M%S') + '-%s-%d.jpg' % (slug(camera.split('.')[-1]), int(maintenant * 1000) % 1000)
    cv2.imwrite(os.path.join(DOSSIER_I, nom), recadrer(img, face))
    inconnus[nom] = (emb, maintenant)
    dernier_inconnu = nom
    nettoyer(DOSSIER_I, GARDER_INCONNUS)
    return nom


def analyser(camera, image=None, urls=None):
    """Prend plusieurs photos (ou celles de l'événement) et garde la meilleure reconnaissance."""
    global derniere
    t0 = time.time()
    essais = []
    sources = []
    for u in (urls or []):
        try:
            im = photo_url(u)
            # Vignette Netatmo souvent petite : on l'agrandit pour que le visage soit détectable.
            if max(im.shape[:2]) < 640:
                f = 640 / max(im.shape[:2])
                im = cv2.resize(im, None, fx=f, fy=f, interpolation=cv2.INTER_CUBIC)
            sources.append(reduire(im))
        except Exception:  # noqa
            pass
    n = len(sources) if sources else (1 if image is not None else TENTATIVES)
    for i in range(n):
        img = sources[i] if sources else (image if image is not None else photo_camera(camera))
        res = []
        for f in visages(img):
            if f[2] < TAILLE_MIN:
                continue
            emb = empreinte(img, f)
            nom, score = identifier(emb)
            res.append({'nom': nom, 'score': round(score, 3), 'boite': [int(v) for v in f[:4]],
                        '_f': f, '_e': emb})
        essais.append((img, res))
        if any(r['nom'] for r in res):
            break
        if not sources and i < TENTATIVES - 1 and image is None:
            time.sleep(0.6)
    img, res = max(essais, key=lambda e: (sum(1 for r in e[1] if r['nom']), len(e[1]),
                                          max([r['score'] for r in e[1]] or [-1])))
    fichiers_inconnus = []
    for r in res:
        if not r['nom']:
            fichiers_inconnus.append(garder_inconnu(img, r['_f'], r['_e'], camera))
    if res:
        vue = img.copy()
        for r in res:
            x, y, w, h = r['boite']
            coul = (80, 200, 120) if r['nom'] else (60, 60, 230)
            cv2.rectangle(vue, (x, y), (x + w, y + h), coul, 2)
            cv2.putText(vue, (joli(r['nom']) if r['nom'] else 'Inconnu') + ' %d%%' % max(0, r['score'] * 100),
                        (x, max(15, y - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, coul, 2)
        ok, jpg = cv2.imencode('.jpg', vue, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if ok:
            derniere = jpg.tobytes()
            with open(os.path.join(DOSSIER_C, time.strftime('%Y%m%d-%H%M%S') + '.jpg'), 'wb') as fh:
                fh.write(derniere)
            nettoyer(DOSSIER_C, GARDER)
    noms = sorted({joli(r['nom']) for r in res if r['nom']})
    n_inc = len(fichiers_inconnus)
    if noms:
        texte = ' et '.join(noms) + (' (+ %d inconnu%s)' % (n_inc, 's' if n_inc > 1 else '') if n_inc else '')
    elif n_inc:
        texte = 'Personne inconnue' if n_inc == 1 else '%d personnes inconnues' % n_inc
    else:
        texte = 'Visage non visible'
    return {'texte': texte, 'personnes': noms, 'inconnus': n_inc, 'visages': len(res),
            'fichiers_inconnus': fichiers_inconnus, 'camera': camera,
            'details': [{k: v for k, v in r.items() if not k.startswith('_')} for r in res],
            'duree': round(time.time() - t0, 2)}


def apprendre(nom, camera):
    nom_s = slug(nom)
    for _ in range(TENTATIVES + 2):
        img = photo_camera(camera)
        fs = visages(img)
        if fs:
            d = os.path.join(DOSSIER_P, nom_s)
            os.makedirs(d, exist_ok=True)
            cv2.imwrite(os.path.join(d, time.strftime('%Y%m%d-%H%M%S') + '.jpg'), recadrer(img, fs[0]))
            return {'ok': True, 'nom': joli(nom_s), 'photos': charger().get(nom_s, 0)}
        time.sleep(0.7)
    return {'ok': False, 'erreur': 'Aucun visage visible devant la caméra'}


def sur(nom):
    return bool(re.fullmatch(r'[A-Za-z0-9_.-]+\.jpg', nom or ''))


def nommer(fichier, nom):
    if not sur(fichier) or not os.path.exists(os.path.join(DOSSIER_I, fichier)):
        return {'ok': False, 'erreur': 'visage introuvable'}
    nom_s = slug(nom)
    d = os.path.join(DOSSIER_P, nom_s)
    os.makedirs(d, exist_ok=True)
    os.replace(os.path.join(DOSSIER_I, fichier), os.path.join(d, fichier))
    emb = inconnus.pop(fichier, (None, 0))[0]
    if emb is not None:
        connus.setdefault(nom_s, []).append(emb)
    else:
        charger()
    return {'ok': True, 'nom': joli(nom_s), 'photos': len(connus.get(nom_s, []))}


def supprimer(fichier):
    if not fichier or '..' in fichier:
        return {'ok': False}
    chemin = os.path.join(DOSSIER_I, fichier) if '/' not in fichier else os.path.join(DOSSIER_P, fichier)
    if not os.path.isfile(chemin) or not chemin.endswith('.jpg'):
        return {'ok': False}
    os.remove(chemin)
    if '/' in fichier:
        charger()
    else:
        inconnus.pop(fichier, None)
    return {'ok': True}


# ---------- Galerie ----------

STYLE = """
:root{--bg:#0B0C0E;--card:#15171B;--line:#24272E;--txt:#F2F1EE;--mut:#8D919A;--acc:#F2B544;--ok:#5BC98A;--ko:#E5675B}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:15px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:24px max(16px,4vw) 60px}
h1{font-size:26px;margin:0 0 4px;font-weight:600}h2{font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin:34px 0 14px;font-weight:600}
.sub{color:var(--mut);margin:0 0 8px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px}
.c{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
.c img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#000}.c .b{padding:10px;display:flex;flex-direction:column;gap:8px}
.meta{font-size:12px;color:var(--mut)}.sug{font-size:12px;color:var(--acc)}
.row{display:flex;gap:6px}input{flex:1;min-width:0;background:#0F1013;border:1px solid var(--line);color:var(--txt);border-radius:10px;padding:8px 10px;font:inherit}
button{border:0;border-radius:10px;padding:8px 11px;font:inherit;font-weight:600;cursor:pointer;background:var(--acc);color:#1A1407}
button.x{background:#24272E;color:var(--mut)}.pers{display:flex;flex-wrap:wrap;gap:14px}
.p{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px;min-width:220px;flex:1}
.p h3{margin:0 0 10px;font-size:17px}.p h3 span{color:var(--mut);font-weight:400;font-size:13px}
.th{display:flex;flex-wrap:wrap;gap:6px}.th div{position:relative}.th img{width:64px;height:64px;object-fit:cover;border-radius:10px;display:block}
.th button{position:absolute;top:-6px;right:-6px;width:22px;height:22px;padding:0;border-radius:50%;font-size:12px;line-height:22px;background:#24272E;color:var(--txt)}
.vide{color:var(--mut);padding:20px;border:1px dashed var(--line);border-radius:16px;text-align:center}
.caps img{width:100%;border-radius:12px;display:block}
"""


def date_lisible(f):
    m = re.match(r'(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})', f)
    return '%s/%s %s:%s' % (m.group(3), m.group(2), m.group(4), m.group(5)) if m else ''


def page():
    noms = sorted(connus)
    opts = ''.join('<option value="%s">' % html.escape(joli(n)) for n in noms)
    cartes = []
    for f in sorted(inconnus, reverse=True)[:120]:
        e = inconnus[f][0]
        nom, score = meilleur(e)
        sug = ''
        if nom and score >= SUGGESTION:
            sug = '<div class="sug">Ressemble à %s (%d %%)</div>' % (html.escape(joli(nom)), score * 100)
        cam = f.split('-')[2] if f.count('-') >= 3 else ''
        cartes.append('''<div class="c"><img loading="lazy" src="i/%s"><div class="b">
<div class="meta">%s · %s</div>%s
<form class="row" onsubmit="return nommer(this,'%s')"><input list="noms" name="nom" placeholder="Prénom" value="%s"><button>OK</button></form>
<button class="x" onclick="suppr('%s',this)">Ignorer</button></div></div>''' % (
            quote(f), date_lisible(f), html.escape(cam), sug, f,
            html.escape(joli(nom)) if sug else '', f))
    pers = []
    for n in noms:
        fs = sorted(glob.glob(os.path.join(DOSSIER_P, n, '*.jpg')), reverse=True)
        th = ''.join('<div><img loading="lazy" src="p/%s/%s"><button onclick="suppr(\'%s/%s\',this)">✕</button></div>'
                     % (quote(n), quote(os.path.basename(x)), n, os.path.basename(x)) for x in fs[:24])
        pers.append('<div class="p"><h3>%s <span>%d photo%s</span></h3><div class="th">%s</div></div>'
                    % (html.escape(joli(n)), len(fs), 's' if len(fs) > 1 else '', th))
    caps = sorted(glob.glob(os.path.join(DOSSIER_C, '*.jpg')), reverse=True)[:8]
    caps_html = ''.join('<div class="c caps"><img loading="lazy" src="c/%s"><div class="b meta">%s</div></div>'
                        % (quote(os.path.basename(x)), date_lisible(os.path.basename(x))) for x in caps)
    return '''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Visages</title><style>%s</style></head><body>
<h1>Visages</h1><p class="sub">Donne un prénom à un visage pour que la sonnette le reconnaisse la prochaine fois. Plus une personne a de photos (5 à 10, sous des angles et éclairages différents), plus elle est reconnue.</p>
<datalist id="noms">%s</datalist>
<h2>À identifier (%d)</h2>%s
<h2>Personnes connues</h2>%s
<h2>Dernières analyses</h2><div class="grid">%s</div>
<script>
async function post(u,d){const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});return r.json()}
async function nommer(f,fichier){const nom=f.nom.value.trim();if(!nom)return false;const r=await post('nommer',{fichier,nom});
 if(r.ok){f.closest('.c').remove()}else alert(r.erreur||'Erreur');return false}
async function suppr(fichier,b){const r=await post('supprimer',{fichier});if(r.ok)(b.closest('.c')||b.parentNode).remove()}
</script></body></html>''' % (STYLE, opts, len(inconnus),
                              '<div class="grid">%s</div>' % ''.join(cartes) if cartes else '<div class="vide">Aucun visage inconnu pour l’instant.</div>',
                              '<div class="pers">%s</div>' % ''.join(pers) if pers else '<div class="vide">Personne n’est encore enregistré.</div>',
                              caps_html)


class Gestion(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _rep(self, code, obj=None, corps=None, type_='application/json; charset=utf-8'):
        corps = corps if corps is not None else json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', type_)
        self.send_header('Content-Length', str(len(corps)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(corps)

    def _fichier(self, chemin):
        if not os.path.isfile(chemin):
            return self._rep(404, {'erreur': 'introuvable'})
        with open(chemin, 'rb') as fh:
            self._rep(200, corps=fh.read(), type_='image/jpeg')

    def _autorise(self):
        if API_TOKEN and self.headers.get('X-Token') != API_TOKEN:
            self._rep(401, {'erreur': 'non autorisé'})
            return False
        return True

    def _json(self):
        n = int(self.headers.get('Content-Length') or 0)
        brut = self.rfile.read(n) if n else b''
        if self.headers.get('Content-Type', '').startswith('image/'):
            return {'_image': brut}
        try:
            return json.loads(brut or b'{}')
        except ValueError:
            return {}

    def do_GET(self):
        p = urlparse(self.path).path
        if p == '/sante':
            return self._rep(200, {'ok': True, 'personnes': {joli(n): len(e) for n, e in connus.items()},
                                   'inconnus': len(inconnus), 'seuil': SEUIL, 'camera': CAMERA})
        if p in ('/', '/index.html'):
            return self._rep(200, corps=page().encode(), type_='text/html; charset=utf-8')
        m = re.fullmatch(r'/i/([A-Za-z0-9_.-]+\.jpg)', p)
        if m:
            return self._fichier(os.path.join(DOSSIER_I, m.group(1)))
        m = re.fullmatch(r'/p/([a-z0-9-]+)/([A-Za-z0-9_.-]+\.jpg)', p)
        if m:
            return self._fichier(os.path.join(DOSSIER_P, m.group(1), m.group(2)))
        m = re.fullmatch(r'/c/([A-Za-z0-9_.-]+\.jpg)', p)
        if m:
            return self._fichier(os.path.join(DOSSIER_C, m.group(1)))
        if p == '/derniere.jpg':
            return self._rep(200, corps=derniere, type_='image/jpeg') if derniere else self._rep(404, {'erreur': 'aucune'})
        if p == '/visage.jpg':
            if dernier_inconnu:
                return self._fichier(os.path.join(DOSSIER_I, dernier_inconnu))
            return self._rep(404, {'erreur': 'aucun'})
        self._rep(404, {'erreur': 'inconnu'})

    def do_POST(self):
        if not self._autorise():
            return
        p = urlparse(self.path).path.rstrip('/')
        d = self._json()
        try:
            if p == '/analyser':
                img = None
                if '_image' in d:
                    img = reduire(cv2.imdecode(np.frombuffer(d['_image'], np.uint8), cv2.IMREAD_COLOR))
                urls = [u for u in (d.get('urls') or []) if isinstance(u, str) and u.startswith('https://')]
                return self._rep(200, analyser(d.get('camera') or CAMERA, img, urls))
            if p == '/apprendre':
                if not d.get('nom'):
                    return self._rep(400, {'erreur': 'nom manquant'})
                return self._rep(200, apprendre(d['nom'], d.get('camera') or CAMERA))
            if p == '/nommer':
                fichier = d.get('fichier') or (dernier_inconnu if d.get('dernier') else None)
                if not d.get('nom') or not fichier:
                    return self._rep(400, {'ok': False, 'erreur': 'nom ou visage manquant'})
                return self._rep(200, nommer(fichier, d['nom']))
            if p == '/supprimer':
                return self._rep(200, supprimer(d.get('fichier')))
            if p == '/recharger':
                return self._rep(200, {'personnes': charger()})
        except Exception as e:  # noqa
            return self._rep(500, {'erreur': str(e), 'texte': 'Analyse impossible'})
        self._rep(404, {'erreur': 'inconnu'})


if __name__ == '__main__':
    print('Personnes chargées :', charger(), flush=True)
    charger_inconnus()
    ThreadingHTTPServer(('0.0.0.0', PORT), Gestion).serve_forever()
