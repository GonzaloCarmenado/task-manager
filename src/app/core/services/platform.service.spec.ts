import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { PlatformService } from './platform.service';

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 15; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36';

function setup(view: { tauri: boolean; userAgent: string } | null): PlatformService {
  const defaultView = view
    ? ({
        navigator: { userAgent: view.userAgent },
        ...(view.tauri ? { __TAURI_INTERNALS__: {} } : {}),
      } as unknown as Window)
    : null;
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: DOCUMENT, useValue: { defaultView } }],
  });
  return TestBed.inject(PlatformService);
}

describe('PlatformService', () => {
  it('US-004-04 Tauri en Android → isTauriAndroid', () => {
    const platform = setup({ tauri: true, userAgent: ANDROID_UA });
    expect(platform.isTauri()).toBe(true);
    expect(platform.isAndroid()).toBe(true);
    expect(platform.isTauriAndroid()).toBe(true);
  });

  it('US-004-04 navegador en Android (sin Tauri) no es Tauri en Android', () => {
    const platform = setup({ tauri: false, userAgent: ANDROID_UA });
    expect(platform.isAndroid()).toBe(true);
    expect(platform.isTauri()).toBe(false);
    expect(platform.isTauriAndroid()).toBe(false);
  });

  it('US-004-04 Tauri de escritorio no es Android', () => {
    const platform = setup({ tauri: true, userAgent: DESKTOP_UA });
    expect(platform.isTauri()).toBe(true);
    expect(platform.isAndroid()).toBe(false);
    expect(platform.isTauriAndroid()).toBe(false);
  });

  it('US-004-04 navegador de escritorio no es Tauri en Android', () => {
    const platform = setup({ tauri: false, userAgent: DESKTOP_UA });
    expect(platform.isTauriAndroid()).toBe(false);
  });

  it('US-004-04 sin window (sin vista) nunca es Tauri en Android y no lanza', () => {
    const platform = setup(null);
    expect(platform.isTauri()).toBe(false);
    expect(platform.isAndroid()).toBe(false);
    expect(platform.isTauriAndroid()).toBe(false);
  });
});
