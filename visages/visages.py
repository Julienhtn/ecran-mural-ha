#!/usr/bin/env python3
"""Reconnaissance des visages pour la sonnette (Home Assistant).

Service HTTP local, sans AVX : OpenCV + YuNet (détection) + SFace (reconnaissance).

  GET  /sante                      état du service
  POST /analyser   {"camera": ..}  prend des photos de la caméra et dit qui est là
  POST /apprendre  {"nom": ..}     enregistre le visage visible maintenant pour cette personne
  POST /recharger                  relit le dossier des personnes
  GET  /derniere.jpg               dernière photo analysée, visages encadrés

Dossiers (sous BASE) :
  personnes/<nom>/*.jpg   photos de référence (une personne par sous-dossier)
  captures/               dernières photos analysées (les 300 plus récentes)
"""
import glob
import json
import os
import re
import threading
import time
import unicodedata
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2
import numpy as np

BASE = os.environ.get('VISAGES_BASE', '/opt/visages')
HA_URL = os.environ.get('HA_URL', 'http://192.168.86.11').rstrip('/')
HA_TOKEN = os.environ.get('HA_TOKEN', '')
CAMERA = os.environ.get('CAMERA', 'camera.sonnette')
API_TOKEN = os.environ.get('API_TOKEN', '')
SEUIL = float(os.environ.get('SEUIL', '0.40'))        # similarité cosinus SFace (0.363 = seuil de référence)
PORT = int(os.environ.get('PORT', '8099'))
TENTATIVES = int(os.environ.get('TENTATIVES', '4'))   # photos prises par analyse
GARDER = 300

DOSSIER_P = os.path.join(BASE, 'personnes')
DOSSIER_C = os.path.join(BASE, 'captures')
os.makedirs(DOSSIER_P, exist_ok=True)
os.makedirs(DOSSIER_C, exist_ok=True)

detecteur = cv2.FaceDetectorYN.create(os.path.join(BASE, 'modeles', 'yunet.onnx'), '', (320, 320), 0.8, 0.3, 5000)
reconnaisseur = cv2.FaceRecognizerSF.create(os.path.join(BASE, 'modeles', 'sface.onnx'), '')
verrou = threading.Lock()
connus = {}   # nom -> liste d'empreintes
derniere = None


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
    """Liste (score_detection, ligne_yunet), du plus grand au plus petit."""
    h, w = img.shape[:2]
    with verrou:
        detecteur.setInputSize((w, h))
        _, faces = detecteur.detect(img)
    if faces is None:
        return []
    return sorted(faces, key=lambda f: -(f[2] * f[3]))


def empreinte(img, face):
    with verrou:
        alig = reconnaisseur.alignCrop(img, face)
        return reconnaisseur.feature(alig).flatten()


def similarite(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


def charger():
    global connus
    nouveau = {}
    for dossier in sorted(glob.glob(os.path.join(DOSSIER_P, '*'))):
        if not os.path.isdir(dossier):
            continue
        nom = os.path.basename(dossier)
        embs = []
        for f in sorted(glob.glob(os.path.join(dossier, '*'))):
            if not re.search(r'\.(jpe?g|png|webp)$', f, re.I):
                continue
            img = cv2.imread(f)
            if img is None:
                continue
            img = reduire(img)
            fs = visages(img)
            if fs:
                embs.append(empreinte(img, fs[0]))
        if embs:
            nouveau[nom] = embs
    connus = nouveau
    return {n: len(e) for n, e in connus.items()}


def identifier(emb):
    meilleur, score = None, -1.0
    for nom, embs in connus.items():
        s = max(similarite(emb, e) for e in embs)
        if s > score:
            meilleur, score = nom, s
    return (meilleur, score) if score >= SEUIL else (None, score)


def photo_camera(camera):
    req = urllib.request.Request(HA_URL + '/api/camera_proxy/' + camera,
                                 headers={'Authorization': 'Bearer ' + HA_TOKEN})
    with urllib.request.urlopen(req, timeout=10) as r:
        data = r.read()
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError('image illisible')
    return reduire(img)


def nettoyer():
    fichiers = sorted(glob.glob(os.path.join(DOSSIER_C, '*.jpg')))
    for f in fichiers[:-GARDER]:
        try:
            os.remove(f)
        except OSError:
            pass


def analyser(camera, image=None):
    """Prend plusieurs photos et garde la meilleure reconnaissance."""
    global derniere
    t0 = time.time()
    essais = []
    for i in range(1 if image is not None else TENTATIVES):
        img = image if image is not None else photo_camera(camera)
        res = []
        for f in visages(img):
            nom, score = identifier(empreinte(img, f))
            res.append({'nom': nom, 'score': round(score, 3), 'boite': [int(v) for v in f[:4]],
                        'taille': int(f[2])})
        essais.append((img, res))
        if any(r['nom'] for r in res):
            break
        if i < TENTATIVES - 1 and image is None:
            time.sleep(0.6)
    img, res = max(essais, key=lambda e: (sum(1 for r in e[1] if r['nom']), len(e[1]),
                                          max([r['score'] for r in e[1]] or [-1])))
    # Image annotée
    vue = img.copy()
    for r in res:
        x, y, w, h = r['boite']
        coul = (80, 200, 120) if r['nom'] else (60, 60, 230)
        cv2.rectangle(vue, (x, y), (x + w, y + h), coul, 2)
        cv2.putText(vue, (joli(r['nom']) if r['nom'] else 'Inconnu') + ' %d%%' % max(0, r['score'] * 100),
                    (x, max(15, y - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, coul, 2)
    ok, jpg = cv2.imencode('.jpg', vue, [cv2.IMWRITE_JPEG_QUALITY, 85])
    derniere = jpg.tobytes() if ok else None
    if derniere:
        with open(os.path.join(DOSSIER_C, time.strftime('%Y%m%d-%H%M%S') + '.jpg'), 'wb') as fh:
            fh.write(derniere)
        nettoyer()
    noms = sorted({joli(r['nom']) for r in res if r['nom']})
    inconnus = sum(1 for r in res if not r['nom'])
    if noms:
        texte = ' et '.join(noms) + (' (+ %d inconnu%s)' % (inconnus, 's' if inconnus > 1 else '') if inconnus else '')
    elif inconnus:
        texte = 'Personne inconnue' if inconnus == 1 else '%d personnes inconnues' % inconnus
    else:
        texte = 'Visage non visible'
    return {'texte': texte, 'personnes': noms, 'inconnus': inconnus, 'visages': len(res),
            'details': res, 'duree': round(time.time() - t0, 2)}


def apprendre(nom, camera):
    nom_s = slug(nom)
    for _ in range(TENTATIVES + 2):
        img = photo_camera(camera)
        fs = visages(img)
        if fs:
            x, y, w, h = [int(v) for v in fs[0][:4]]
            m = int(max(w, h) * 0.6)
            crop = img[max(0, y - m):y + h + m, max(0, x - m):x + w + m]
            d = os.path.join(DOSSIER_P, nom_s)
            os.makedirs(d, exist_ok=True)
            cv2.imwrite(os.path.join(d, time.strftime('%Y%m%d-%H%M%S') + '.jpg'), crop)
            return {'ok': True, 'nom': joli(nom_s), 'photos': charger().get(nom_s, 0)}
        time.sleep(0.7)
    return {'ok': False, 'erreur': 'Aucun visage visible devant la caméra'}


class Gestion(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _rep(self, code, obj=None, corps=None, type_='application/json'):
        corps = corps if corps is not None else json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', type_)
        self.send_header('Content-Length', str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

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
        if self.path == '/sante':
            return self._rep(200, {'ok': True, 'personnes': {joli(n): len(e) for n, e in connus.items()},
                                   'seuil': SEUIL, 'camera': CAMERA})
        if self.path.startswith('/derniere.jpg'):
            if not self._autorise():
                return
            return self._rep(200, corps=derniere or b'', type_='image/jpeg') if derniere else self._rep(404, {'erreur': 'aucune'})
        self._rep(404, {'erreur': 'inconnu'})

    def do_POST(self):
        if not self._autorise():
            return
        d = self._json()
        try:
            if self.path == '/analyser':
                img = None
                if '_image' in d:
                    img = reduire(cv2.imdecode(np.frombuffer(d['_image'], np.uint8), cv2.IMREAD_COLOR))
                return self._rep(200, analyser(d.get('camera') or CAMERA, img))
            if self.path == '/apprendre':
                if not d.get('nom'):
                    return self._rep(400, {'erreur': 'nom manquant'})
                return self._rep(200, apprendre(d['nom'], d.get('camera') or CAMERA))
            if self.path == '/recharger':
                return self._rep(200, {'personnes': charger()})
        except Exception as e:  # noqa
            return self._rep(500, {'erreur': str(e), 'texte': 'Analyse impossible'})
        self._rep(404, {'erreur': 'inconnu'})


if __name__ == '__main__':
    print('Personnes chargées :', charger(), flush=True)
    ThreadingHTTPServer(('0.0.0.0', PORT), Gestion).serve_forever()
