import { FocusMonitor } from '@angular/cdk/a11y';
import { Component, OnInit, forwardRef, Injector, ElementRef, OnDestroy, HostBinding, DoCheck } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl, Validators, NgControl } from '@angular/forms';
import { MatFormFieldControl } from '@angular/material/form-field';
import { timer, of, Observable, Subject, MonoTypeOperatorFunction } from 'rxjs';
import { debounce, map, switchMap, tap, catchError } from 'rxjs/operators';
import { ResourceService, Playlist } from '../resource.service';

@Component({
  selector: 'app-playlist-input',
  templateUrl: './playlist-input.component.html',
  styleUrls: ['./playlist-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PlaylistInputComponent),
      multi: true
    },
    {
      provide: MatFormFieldControl,
      useExisting: PlaylistInputComponent
    }
  ]
})
export class PlaylistInputComponent implements OnInit, OnDestroy, DoCheck, ControlValueAccessor, MatFormFieldControl<string> {
  static nextId = 0;
  @HostBinding() id = `playlist-input-${PlaylistInputComponent.nextId++}`;
  @HostBinding('class.floating') get shouldLabelFloat() { return this.focused || !this.empty; }

  playlist!: Observable<Playlist | undefined>;
  state = new Subject<'loading' | 'error' | undefined>();
  control = new FormControl('', Validators.required);

  stateChanges = new Subject<void>();
  placeholder = 'https://open.spotify.com/playlist/5vuKhUOZnI5PUv0E7VU68C?si=641c39a10f1d491a';
  ngControl!: NgControl;
  focused = false;
  required = true;
  disabled = false;
  errorState = false;

  constructor(private resource: ResourceService, public elRef: ElementRef, public injector: Injector, private fm: FocusMonitor) {
    fm.monitor(elRef.nativeElement, true).subscribe(origin => {
      this.focused = !!origin;
      this.stateChanges.next();
    });
  }

  ngOnInit() {
    this.ngControl = this.injector.get(NgControl);
    this.ngControl.valueAccessor = this;

    this.playlist = this.control.valueChanges.pipe(
      debounce(value => timer(value ? 300 : 0)),
      tap(() => this.onValidationChange()),
      tap(() => this.state.next('loading')),
      map(value => this.sanitize(value)),
      switchMap(id => !id ?
        of(undefined).pipe(this.loadFinished()) :
        this.resource.getPlaylist(id).pipe(
          this.loadFinished(),
          catchError(() => {
            this.state.next('error');
            return of(undefined);
          })
        ))
    );
  }

  ngDoCheck(): void {
    this.errorState = this.control.invalid && !!this.ngControl.touched;
    this.stateChanges.next();
  }

  ngOnDestroy() {
    this.fm.stopMonitoring(this.elRef.nativeElement);
  }

  private loadFinished(): MonoTypeOperatorFunction<Playlist | undefined> {
    return tap(playlist => {
      this.state.next(undefined);
      this.onChange(playlist?.id);
    });
  }

  clear(): void {
    this.control.setValue('');
    this.state.next(undefined);
  }

  private sanitize(value: string): string {
    if (value.startsWith('http')) {
      return value.substring(value.lastIndexOf('/') + 1, value.indexOf('?'));
    } else {
      return value;
    }
  }

  setDescribedByIds(ids: string[]): void {}
  onContainerClick(event: MouseEvent): void {}
  onChange: any = () => {}
  onTouch: any = () => {}
  onValidationChange: any = () => {};

  writeValue(value: any) {
    this.control.setValue(value);
  }

  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouch = fn;
  }

  get value(): string {
    return this.control.value;
  }

  get empty(): boolean {
    return !this.value;
  }
}
