import './index.css';
import {platformBridge} from './platform/platformBridge';

// Self-contained pointer lock protection before 3D controls load.
const SAFE_POINTER_LOCK_PATCHED = '__playgroundSafePointerLockPatched__';

function ensureSafePointerLockPatch(): void {
  if (typeof Element === 'undefined' || !Element.prototype) return;
  try {
    if (Reflect.get(Element.prototype, SAFE_POINTER_LOCK_PATCHED)) return;
    const nativeRequestPointerLock = Element.prototype.requestPointerLock;
    if (typeof nativeRequestPointerLock !== 'function') return;
    Object.defineProperty(Element.prototype, SAFE_POINTER_LOCK_PATCHED, {
      value: true,
      configurable: true,
    });
    Element.prototype.requestPointerLock = function patchedRequestPointerLock(
      this: Element,
      ...args: Parameters<Element['requestPointerLock']>
    ): ReturnType<Element['requestPointerLock']> {
      try {
        const result = nativeRequestPointerLock.apply(this, args);
        Promise.resolve(result).catch(() => {});
        return result;
      } catch (err) {
        const rejected = Promise.reject(err);
        rejected.catch(() => {});
        return rejected;
      }
    };
  } catch {
    // Ignore frozen Element.prototype realms.
  }
}

ensureSafePointerLockPatch();

async function bootstrap() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  // Immediate splash in pure DOM with zero React/Three/Rapier dependency
  rootElement.innerHTML =
    '<div style="width:100vw;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#17132a;color:#f2d388;font-family:Georgia,serif;"><div style="font-size:28px;font-weight:700;letter-spacing:0.5px;">Astral Terraces</div><div style="margin-top:10px;font-family:system-ui,sans-serif;font-size:13px;color:#7ebdb6;">Awakening Celestial Sanctuary...</div></div>';

  // 1. Initialize host platform SDK immediately before heavy 3D/WASM bundles load
  const bridgeReadyPromise = Promise.race([
    platformBridge.init().catch(() => null),
    new Promise((resolve) => window.setTimeout(resolve, 4000)),
  ]);

  // 2. Dynamically load React + UI shell chunks cleanly
  const [reactMod, {createRoot}, {default: BootstrapRoot}] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./BootstrapRoot'),
  ]);
  const createElement =
    (
      reactMod as unknown as {
        createElement?: typeof reactMod.default.createElement;
        default: typeof reactMod.default;
      }
    ).createElement ?? reactMod.default.createElement;

  await bridgeReadyPromise;

  const root = createRoot(rootElement);
  root.render(createElement(BootstrapRoot));
}

bootstrap().catch((err) => {
  console.error('[Astral Terraces] Bootstrap error:', err);
});
