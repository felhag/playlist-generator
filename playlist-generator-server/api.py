import os

import flask
from flask import Flask, request
from flask_api import status
from flask_session import Session

import lastfm
import spotify

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(64)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = './.flask_session/'
Session(app)


@app.route('/api/auth')
def auth():
    auth_manager = spotify.login()

    if request.args.get("code"):
        # Step 3. Being redirected from Spotify auth page
        auth_manager.get_access_token(request.args.get("code"))
    elif not auth_manager.validate_token(auth_manager.cache_handler.get_cached_token()):
        # Step 2. Display sign in link when no token
        resp = flask.Response('Unauthorized')
        resp.headers['Location'] = auth_manager.get_authorize_url()
        return resp, status.HTTP_401_UNAUTHORIZED

    return spotify.me(auth_manager)


@app.route('/api/sign_out')
def sign_out():
    spotify.logout()
    return '', status.HTTP_204_NO_CONTENT


@app.route('/api/playlist/<playlist_id>')
def playlists(playlist_id):
    return spotify.get_playlists(playlist_id)


@app.route('/api/generate', methods=['POST'])
def generate():
    data = request.get_json()
    seeds = [data.get('seed')]
    username = data.get('username')

    exclusions = list(map(lambda t: (t['artist'].lower(), t['track'].lower()), lastfm.get_exclusions(username)))
    return spotify.generate(exclusions, seeds, 100)


@app.route('/api/persist', methods=['POST'])
def persist():
    data = request.get_json()
    uris = data.get('uris')
    pid = str(data.get('playlist_id'))
    playlist_id = pid if not pid.startswith('https://') else pid.split('/')[-1].split('?')[0]

    spotify.save(playlist_id, uris)

    return spotify.get_playlists(playlist_id)


'''
Following lines allow application to be run more conveniently with
`python api.py` (Make sure you're using python3)
(Also includes directive to leverage pythons threading capacity.)
'''
if __name__ == '__main__':
    app.run(threaded=True, port=13337)
