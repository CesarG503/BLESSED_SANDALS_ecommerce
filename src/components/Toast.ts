export type ToastType = 'success' | 'info' | 'favorite' | 'warning';

export class Toast {
  private static container: HTMLElement | null = null;

  private static getContainer(): HTMLElement {
    if (!Toast.container) {
      Toast.container = document.createElement('div');
      Toast.container.id = 'toast-container';
      Toast.container.className = 'toast-container';
      document.body.appendChild(Toast.container);
    }
    return Toast.container;
  }

  public static show(message: string, title: string = 'Blessed Sandals', type: ToastType = 'success', duration: number = 3200): void {
    const container = Toast.getContainer();

    const toastEl = document.createElement('div');
    toastEl.className = `toast-item toast-${type} animate-slide-in-right`;

    let iconSvg = '';
    if (type === 'favorite') {
      iconSvg = `<svg class="toast-icon toast-icon-heart" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    } else if (type === 'success') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toastEl.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon-wrap">${iconSvg}</div>
        <div class="toast-text">
          <p class="toast-title">${title}</p>
          <p class="toast-message">${message}</p>
        </div>
      </div>
      <button class="toast-close" aria-label="Cerrar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <div class="toast-progress"></div>
    `;

    const closeBtn = toastEl.querySelector('.toast-close');
    const dismiss = () => {
      toastEl.classList.remove('animate-slide-in-right');
      toastEl.classList.add('animate-fade-out');
      setTimeout(() => {
        toastEl.remove();
      }, 300);
    };

    closeBtn?.addEventListener('click', dismiss);
    container.appendChild(toastEl);

    setTimeout(dismiss, duration);
  }
}
