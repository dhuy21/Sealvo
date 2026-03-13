/* global showNotification */
(function () {
  var STORAGE_KEY = 'activeJobs';
  var reloadScheduled = false;

  function getActiveJobs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveActiveJobs(jobs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }

  function addJob(jobId) {
    var jobs = getActiveJobs().filter(function (j) {
      return j.id !== jobId;
    });
    jobs.push({ id: jobId, ts: Date.now() });
    saveActiveJobs(jobs);
  }

  function removeJob(jobId) {
    saveActiveJobs(
      getActiveJobs().filter(function (j) {
        return j.id !== jobId;
      })
    );
  }

  function notify(message, type, duration) {
    if (typeof showNotification === 'function') {
      showNotification(message, type, duration);
    }
  }

  function scheduleReload() {
    if (reloadScheduled) return;
    reloadScheduled = true;
    setTimeout(function () {
      window.location.reload();
    }, 2500);
  }

  function watchJob(jobId) {
    var source = new EventSource('/api/jobs/' + jobId + '/stream');

    source.onmessage = function (event) {
      try {
        var data = JSON.parse(event.data);

        if (data.status === 'processing' && data.progress) {
          var p = data.progress;
          if (p.phase === 'parsing') notify('Préparation des données...', 'info', 0);
          else if (p.phase === 'gemini') notify('Analyse IA en cours...', 'info', 0);
          else if (p.phase === 'saving') {
            var pct = p.total > 0 ? Math.round((p.current / p.total) * 100) : 0;
            notify('Enregistrement... ' + pct + '%', 'info', 0);
          }
        }

        if (data.status === 'completed') {
          source.close();
          removeJob(jobId);
          var r = data.result || {};
          notify(
            (r.imported || 0) + ' mot(s) importé(s). ' + (r.errors || 0) + ' erreur(s).',
            'success'
          );
          scheduleReload();
        } else if (data.status === 'failed') {
          source.close();
          removeJob(jobId);
          notify(data.error || 'Le traitement a échoué', 'error');
          scheduleReload();
        } else if (data.status === 'stream_unavailable') {
          source.close();
          removeJob(jobId);
          notify('Traitement en cours. Veuillez rafraîchir la page.', 'info');
          scheduleReload();
        }
      } catch (err) {
        console.error('[jobWatcher] SSE parse error:', err);
      }
    };

    source.onerror = function () {
      source.close();
    };
  }

  function watchFromLocalStorage() {
    var jobs = getActiveJobs();
    var oneHourAgo = Date.now() - 3600000;
    var valid = jobs.filter(function (j) {
      return j.ts > oneHourAgo;
    });
    if (valid.length !== jobs.length) saveActiveJobs(valid);
    valid.forEach(function (j) {
      watchJob(j.id);
    });
  }

  function resumeActiveJobs() {
    fetch('/api/jobs/active')
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        if (data && data.jobs) {
          var serverJobs = data.jobs.map(function (j) {
            return { id: j.id, ts: j.createdAt || Date.now() };
          });
          saveActiveJobs(serverJobs);
          serverJobs.forEach(function (j) {
            watchJob(j.id);
          });
        } else {
          watchFromLocalStorage();
        }
      })
      .catch(function () {
        watchFromLocalStorage();
      });
  }

  window.addEventListener('pageshow', function (e) {
    var isBack = e.persisted;
    if (!isBack && performance.getEntriesByType) {
      var nav = performance.getEntriesByType('navigation');
      if (nav.length && nav[0].type === 'back_forward') isBack = true;
    }
    if (isBack) window.location.reload();
  });

  window.JobWatcher = { addJob: addJob, removeJob: removeJob };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', resumeActiveJobs);
  } else {
    resumeActiveJobs();
  }
})();
