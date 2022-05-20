import { SelectionModel } from '@angular/cdk/collections';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, of } from 'rxjs';

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
    displayedColumns: string[] = ['select', 'artist', 'track', 'id'];
    selection = new SelectionModel<Recommendation>(true, []);
    dataSource = new MatTableDataSource<Recommendation>();

    baseUrl = '/api';
    seeds: Playlist[] = [];
    target = '';
    username = new FormControl();

    constructor(private http: HttpClient) {
    }

    ngOnInit(): void {
        const code = new URLSearchParams(window.location.search).get('code');
        const params = code ? new HttpParams().set('code', code) : new HttpParams();
        this.http.get(`${this.baseUrl}/auth`, {params}).subscribe({
            next: () => {},
            error: e => {
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
        const body = {
            seeds: this.seeds.map(s => s.id),
            username: this.username.value
        }
        this.http.post<{recommendations: Recommendation[]}>(`${this.baseUrl}/generate`, body).subscribe(result => {
            const data = this.dataSource.data;
            data.push(...result.recommendations);
            this.dataSource.data = data;
            this.selection.select(...result.recommendations);
        });
    }

    persist() {
        this.http.post<{recommendations: Recommendation[]}>(`${this.baseUrl}/persist`, {
            playlist_id: this.target,
            uris: this.selection.selected.map(g => g.id)
        }).subscribe(result => {

        });
    }

    /** Selects all rows if they are not all selected; otherwise clear selection. */
    masterToggle() {
        if (this.selection.selected.length === this.dataSource.data.length) {
            this.selection.clear();
            return;
        }

        this.selection.select(...this.dataSource.data);
    }

    artistUrl(elem: Recommendation): string {
        return `https://www.last.fm/user/${this.username.value}/library/music/${encodeURIComponent(elem.artist)}`
    }
}
