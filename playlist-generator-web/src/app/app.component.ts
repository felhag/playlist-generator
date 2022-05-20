import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';

interface Playlist {
    id: string;
    name: Observable<any>
}

interface Recommendation {
    artist: string;
    track: string;
    id: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    baseUrl = '/api';
    seeds: Playlist[] = [];
    generated = new BehaviorSubject<Recommendation[]>([]);
    target = '';

    constructor(private http: HttpClient) {
    }

    ngOnInit(): void {
        const code = new URLSearchParams(window.location.search).get('code');
        const params = code ? new HttpParams().set('code', code) : new HttpParams();
        this.http.get(`${this.baseUrl}/auth`, {params}).subscribe({
            next: () => {},
            error: e => {
                console.log('401', e);
                if (e.status === 401) {
                    window.location = e.headers.get('Location');
                }
            }
        });
    }

    update(value: string): void {
        this.seeds = (value || '').split(/\s+/).map(v => this.sanitize(v)).filter(v => !!v).map(id => this.getPlayList(id));
    }

    private sanitize(value: string): string {
        if (value.startsWith('http')) {
            return value.substring(value.lastIndexOf('/') + 1, value.indexOf('?'));
        } else {
            return value;
        }
    }

    private getPlayList(id: string): Playlist {
        return {
            id,
            name: of()//this.http.get(`${this.baseUrl}/playlist/${id}`)
        }
    }

    generate() {
        this.http.post<{recommendations: Recommendation[]}>(`${this.baseUrl}/generate`, this.seeds.map(s => s.id)).subscribe(result => {
            this.generated.next([...this.generated.value, ...result.recommendations]);
        });
    }

    persist() {
        this.http.post<{recommendations: Recommendation[]}>(`${this.baseUrl}/persist`, {
            playlist_id: this.target,
            uris: this.generated.value.map(g => g.id)
        }).subscribe(result => {

        });
    }
}
