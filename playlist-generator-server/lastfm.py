import json
import os
import re
import time

import requests
from requests.adapters import HTTPAdapter, Retry
from conf import *

def get_exclusions(username):
    filename = './.lfm-cache/' + re.sub(r'\W+', '', username) + '.json'
    if os.path.exists(filename) and os.path.getsize(filename) > 0:
        with open(filename, 'r', encoding='utf-8') as f:
            result = json.load(f)
    else:
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        with open(filename, 'w', encoding='utf-8') as f:
            result = build_exclusions(username)
            f.write(json.dumps(result, ensure_ascii=False))

    f.close()
    return result


def build_exclusions(username):
    toptracks = get_top_tracks(username, 1)
    tracks = list(parse_tracks(toptracks))
    pages = int(toptracks['@attr']['totalPages'])
    for i in range(2, pages):
        tracks.extend(parse_tracks(get_top_tracks(username, i)))
    return tracks


def parse_tracks(toptracks):
    return map(lambda track: {
        'artist': track['artist']['name'],
        'track': track['name'],
    }, toptracks['track'])


def get_top_tracks(username, page):
    params = {
        'method': 'user.gettoptracks',
        'api_key': lfmApiKey,
        'format': 'json',
        'limit': '1000',
        'user': username,
        'page': page
    }

    start = time.time()
    session = requests.Session()
    retries = Retry(total=5,
                    backoff_factor=0.1,
                    status_forcelist=[500, 502, 503, 504])
    session.mount('https://', HTTPAdapter(max_retries=retries))
    result = session.get(url='https://ws.audioscrobbler.com/2.0', params=params)
    print(f'retrieving page {page} for {username} took {round(time.time() - start, 2)} seconds')
    return result.json()['toptracks']
