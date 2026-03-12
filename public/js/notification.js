/* exported showNotification */
var _notifHideTimer = null;

/**
 * @param {string}  message  - Text to display
 * @param {string}  [type]   - 'info' | 'success' | 'error'
 * @param {number}  [duration] - Auto-hide delay in ms. 0 = persistent (stays until next call).
 */
function showNotification(message, type, duration) {
  if (type === undefined) type = 'info';
  if (duration === undefined) duration = 3000;

  var notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    document.body.appendChild(notification);
  }

  if (_notifHideTimer) {
    clearTimeout(_notifHideTimer);
    _notifHideTimer = null;
  }

  var icon;
  if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
  else if (type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';
  else if (duration === 0) icon = '<i class="fas fa-spinner fa-spin"></i>';
  else icon = '<i class="fas fa-info-circle"></i>';

  notification.innerHTML = icon + ' ' + message.replace(/\n/g, '<br>');

  if (notification.classList.contains('show')) {
    notification.className = type + ' show';
  } else {
    notification.className = type;
    setTimeout(function () {
      notification.classList.add('show');
    }, 10);
  }

  if (duration > 0) {
    _notifHideTimer = setTimeout(function () {
      notification.classList.remove('show');
    }, duration);
  }
}
