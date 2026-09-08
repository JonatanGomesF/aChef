/**
 * Desliza suavemente (slow motion fluido) até o alvo desejado (elemento por ID ou posição Y em pixels).
 *
 * @param target string (ID do elemento com ou sem #), número (posição Y) ou HTMLElement
 * @param options opções de duração (ms) e offset (para compensar header fixo)
 */
export function smoothScrollTo(
  target: HTMLElement | string | number,
  options?: {
    duration?: number;
    offset?: number;
    onComplete?: () => void;
  }
) {
  const { duration = 1200, offset = -75, onComplete } = options || {};

  const startPosition = window.pageYOffset || document.documentElement.scrollTop;
  let targetPosition = 0;

  if (typeof target === "number") {
    targetPosition = target;
  } else if (typeof target === "string") {
    const id = target.startsWith("#") ? target.slice(1) : target;
    const element = document.getElementById(id);
    if (!element) return;
    const rect = element.getBoundingClientRect();
    targetPosition = rect.top + window.pageYOffset + offset;
  } else if (target instanceof HTMLElement) {
    const rect = target.getBoundingClientRect();
    targetPosition = rect.top + window.pageYOffset + offset;
  }

  // Limite máximo de rolagem da página
  const maxScroll = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight
  );
  targetPosition = Math.max(0, Math.min(targetPosition, maxScroll));

  const distance = targetPosition - startPosition;
  if (Math.abs(distance) < 2) {
    if (onComplete) onComplete();
    return;
  }

  // Duração calculada para manter sensação contínua, elegante e em câmera lenta
  const calculatedDuration = Math.max(900, Math.min(1500, duration));

  let startTime: number | null = null;
  let isCancelled = false;

  // Cancela a animação se o usuário rolar manualmente com o mouse ou toque
  const cancelScroll = () => {
    isCancelled = true;
    cleanupListeners();
  };

  const cleanupListeners = () => {
    window.removeEventListener("wheel", cancelScroll);
    window.removeEventListener("touchmove", cancelScroll);
  };

  window.addEventListener("wheel", cancelScroll, { passive: true });
  window.addEventListener("touchmove", cancelScroll, { passive: true });

  // Curva de interpolação easeInOutCubic: aceleração e desaceleração super suaves
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const step = (currentTime: number) => {
    if (isCancelled) {
      cleanupListeners();
      return;
    }

    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / calculatedDuration, 1);
    const ease = easeInOutCubic(progress);

    window.scrollTo(0, startPosition + distance * ease);

    if (timeElapsed < calculatedDuration) {
      requestAnimationFrame(step);
    } else {
      cleanupListeners();
      if (onComplete) onComplete();
    }
  };

  requestAnimationFrame(step);
}
