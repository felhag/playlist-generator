import os
import uuid

import spotipy
import conf
from flask import session

caches_folder = './.cache/'
if not os.path.exists(caches_folder):
    os.makedirs(caches_folder)


def session_cache_path():
    return caches_folder + session.get('uuid')


def get_api():
    cache_handler = spotipy.cache_handler.CacheFileHandler(cache_path=session_cache_path())
    auth_manager = spotipy.oauth2.SpotifyOAuth(client_id=conf.clientId,
                                               client_secret=conf.clientSecret,
                                               redirect_uri=conf.redirectUrl,
                                               cache_handler=cache_handler)
    return spotipy.Spotify(auth_manager=auth_manager)


def login():
    if not session.get('uuid'):
        session['uuid'] = str(uuid.uuid4())

    cache_handler = spotipy.cache_handler.CacheFileHandler(cache_path=session_cache_path())

    return spotipy.oauth2.SpotifyOAuth(client_id=conf.clientId,
                                       client_secret=conf.clientSecret,
                                       redirect_uri=conf.redirectUrl,
                                       cache_handler=cache_handler,
                                       scope='playlist-modify-private playlist-modify-public user-read-currently-playing',
                                       show_dialog=True)


def logout():
    try:
        # Remove the CACHE file (.cache-test) so that a new user can authorize.
        os.remove(session_cache_path())
        session.clear()
    except OSError as e:
        print("Error: %s - %s." % (e.filename, e.strerror))


def me(auth_manager):
    return spotipy.Spotify(auth_manager=auth_manager).me()


def get_playlists(playlist_id):
    sp = get_api()
    playlist = sp.playlist(playlist_id)
    items = playlist["tracks"]["items"]
    return {
        "id": playlist['id'],
        "url": playlist['external_urls']['spotify'],
        "name": playlist['name'],
        "items": len(items),
    }


def generate(exclusions, seeds, target):
    sp = get_api()

    uris = []

    for playlist_id in seeds:
        playlist = sp.playlist(playlist_id)
        items = playlist["tracks"]["items"]
        ids = list(map(lambda item: item["track"]["id"], items))
        total = 0
        new = 0

        seed_size = 5
        recom_size = 25
        i = seed_size

        while len(uris) < target and len(ids) > i:
            recomms = sp.recommendations(seed_tracks=ids[i - seed_size:i], limit=recom_size)
            i = i + seed_size

            for recom in recomms["tracks"]:
                artist = recom['artists'][0]['name']
                track = recom['name']
                contains = (artist.lower(), track.lower()) in exclusions
                print('#', 'true :' if contains else 'false:', artist, '-', track)
                total = total + 1
                if not contains:
                    new = new + 1
                    uris.append({
                        "artist": artist,
                        "track": track,
                        "id": recom['uri']
                    })
                    exclusions.append((artist, track))

        print(f'{new}/{total} were new tracks')
    return {"recommendations": uris}


def save(playlist_id, uris):
    sp = get_api()

    for i in range(0, len(uris), 100):
        chunk = uris[i:i + 100]
        sp.playlist_add_items(playlist_id=playlist_id, items=chunk)
