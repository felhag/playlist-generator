import { SelectionModel } from '@angular/cdk/collections';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, Subject } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { ResourceService, Login, Recommendation } from './resource.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  login = new Subject<Login | undefined>();
  loginObs!: Observable<Login | undefined>;
  displayedColumns: string[] = ['select', 'artist', 'track', 'id'];
  selection = new SelectionModel<Recommendation>(true, []);
  dataSource = new MatTableDataSource<Recommendation>();

  baseUrl = '/api';

  group = new FormGroup({
    src: new FormGroup({
      username: new FormControl('', Validators.required),
      seed: new FormControl('', Validators.required),
    }),
    target: new FormControl('', Validators.required)
  });

  constructor(private resource: ResourceService, private snackbar: MatSnackBar) {
  }

  ngOnInit(): void {
    this.doLogin();
    this.loginObs = this.login.asObservable().pipe(shareReplay());
  }

  doLogin(): void {
    this.resource.login().subscribe(l => this.login.next(l));
  }

  logout(): void {
    this.resource.logout().subscribe(() => this.login.next(undefined));
  }

  generate() {
    const src = this.srcGroup;
    if (!src.valid) {
      src.markAllAsTouched();
      return;
    }
    this.resource.generate(src.getRawValue()).subscribe(result => {
      const data = this.dataSource.data;
      data.push(...result);
      this.dataSource.data = data.filter((r, idx, self) => self.findIndex(i => i.id === r.id) === idx);
      this.selection.select(...result);
    });
  }

  persist() {
    const target = this.group.controls.target as FormControl;
    if (!target.valid || !this.selection.hasValue()) {
      target.markAsTouched();
      return;
    }

    this.resource.persist(target.value, this.selection.selected.map(g => g.id)).subscribe(playlist => {
      this.snackbar.open(`Added ${this.selection.selected.length} tracks to ${playlist.name}`, 'Open', { duration: 5000 })
        .onAction()
        .subscribe(() => window.open(playlist.url));
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
    return `https://www.last.fm/user/${this.srcGroup.controls.username.value}/library/music/${encodeURIComponent(elem.artist)}`
  }

  private get srcGroup(): FormGroup {
    return this.group.controls.src as FormGroup;
  }
}
