import os

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

    return spotipy.oauth2.SpotifyOAuth(client_id=conf.clientId,
                                       client_secret=conf.clientSecret,
                                       redirect_uri=conf.redirectUrl,
                                       cache_handler=cache_handler)


def get_playlists(playlist_id):
    auth_manager = get_api()
    sp = spotipy.Spotify(auth_manager=auth_manager)
    playlist = sp.playlist(playlist_id)
    items = playlist["tracks"]["items"]
    return {
        "id": playlist['id'],
        "name": playlist['name'],
        "items": len(items),
    }


def generate(exclusions, seeds, target):
    auth_manager = get_api()
    sp = spotipy.Spotify(auth_manager=auth_manager)

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
    auth_manager = get_api()
    sp = spotipy.Spotify(auth_manager=auth_manager)

    for i in range(0, len(uris), 100):
        chunk = uris[i:i + 100]
        sp.playlist_add_items(playlist_id=playlist_id, items=chunk)
