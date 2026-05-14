// Amilu Field Data Collection WP Admin JavaScript

jQuery(document).ready(function($) {
    'use strict';

    // Initialize Charts if Chart.js is available and we're on dashboard page
    if (typeof Chart !== 'undefined' && $('#mfdc-charts').length) {
        initializeCharts();
    }

    // Initialize Leaflet map on Entries page
    if (typeof L !== 'undefined' && $('#mfdc-entries-map').length && window.mfdcMapMarkers) {
        initLeafletMap('mfdc-entries-map', window.mfdcMapMarkers);
    }

    // Add smooth animations to stats
    $('.stat-number').each(function() {
        const $this = $(this);
        const countTo = parseInt($this.text());
        
        $({ countNum: 0 }).animate({
            countNum: countTo
        }, {
            duration: 1500,
            easing: 'swing',
            step: function() {
                $this.text(Math.floor(this.countNum));
            },
            complete: function() {
                $this.text(this.countNum);
            }
        });
    });

    // View entry details in modal
    $(document).on('click', '.view-entry', function(e) {
        e.preventDefault();
        const entry = $(this).data('entry');
        if (entry) showEntryModal(entry);
    });

    // Close modal
    $(document).on('click', '#mfdc-modal-close, #mfdc-entry-modal', function(e) {
        if (e.target === this) $('#mfdc-entry-modal').css('display', 'none');
    });
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') $('#mfdc-entry-modal').css('display', 'none');
    });

    // Delete entry
    $(document).on('click', '.mfdc-delete-entry', function(e) {
        e.preventDefault();
        const btn = $(this);
        const entryId = btn.data('id');

        if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
            return;
        }

        btn.prop('disabled', true).text('Deleting…');

        $.post(mfdcAdmin.ajaxUrl, {
            action: 'mfdc_delete_entry',
            nonce: mfdcAdmin.nonce,
            entry_id: entryId
        })
        .done(function(res) {
            if (res.success) {
                btn.closest('tr').fadeOut(300, function() { $(this).remove(); });
            } else {
                alert(res.data?.message || 'Delete failed');
                btn.prop('disabled', false).text('Delete');
            }
        })
        .fail(function() {
            alert('Network error');
            btn.prop('disabled', false).text('Delete');
        });
    });
});

function initializeCharts() {
    const $ = jQuery;
    
    // Get chart data from page
    const chartData = window.mfdcChartData || {};
    
    // Entries per day chart
    if ($('#entriesPerDayChart').length && chartData.entriesPerDay) {
        createLineChart('entriesPerDayChart', chartData.entriesPerDay);
    }

    // Entries by project chart
    if ($('#entriesByProjectChart').length && chartData.entriesByProject) {
        createBarChart('entriesByProjectChart', chartData.entriesByProject);
    }

    // Field distribution chart
    if ($('#fieldDistributionChart').length && chartData.fieldDistribution) {
        createPieChart('fieldDistributionChart', chartData.fieldDistribution);
    }
}

function createLineChart(canvasId, data) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Entries',
                data: data.values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function createBarChart(canvasId, data) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Entries',
                data: data.values,
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(240, 147, 251, 0.8)',
                    'rgba(79, 172, 254, 0.8)',
                    'rgba(245, 87, 108, 0.8)',
                    'rgba(0, 242, 254, 0.8)'
                ],
                borderColor: [
                    '#667eea',
                    '#f093fb',
                    '#4facfe',
                    '#f5576c',
                    '#00f2fe'
                ],
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function createPieChart(canvasId, data) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(240, 147, 251, 0.8)',
                    'rgba(79, 172, 254, 0.8)',
                    'rgba(245, 87, 108, 0.8)',
                    'rgba(0, 242, 254, 0.8)',
                    'rgba(118, 75, 162, 0.8)'
                ],
                borderColor: '#fff',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 13
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function showEntryModal(entry) {
    const $ = jQuery;
    const modal = $('#mfdc-entry-modal');
    const title = $('#mfdc-modal-title');
    const body = $('#mfdc-modal-body');

    title.text(entry.title || 'Entry #' + entry.id);

    let html = '<table style="width:100%;border-collapse:collapse;">';
    html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 0;font-weight:600;color:#6b7280;width:120px;">ID</td><td style="padding:10px 0;">' + escHtml(String(entry.id)) + '</td></tr>';
    html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 0;font-weight:600;color:#6b7280;">UUID</td><td style="padding:10px 0;font-size:12px;word-break:break-all;">' + escHtml(entry.uuid || '') + '</td></tr>';
    html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 0;font-weight:600;color:#6b7280;">Created</td><td style="padding:10px 0;">' + escHtml(entry.created_at || '') + '</td></tr>';

    if (entry.latitude && entry.longitude) {
        html += '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 0;font-weight:600;color:#6b7280;">Location</td><td style="padding:10px 0;"><a href="https://www.google.com/maps?q=' + entry.latitude + ',' + entry.longitude + '" target="_blank">' + entry.latitude + ', ' + entry.longitude + ' ↗</a></td></tr>';
    }

    // Show entry_data fields with human-readable labels
    if (entry.entry_data && typeof entry.entry_data === 'object') {
        const labels = window.mfdcFieldLabels || {};
        html += '<tr><td colspan="2" style="padding:14px 0 6px;"><strong style="font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:#667eea;">Form Data</strong></td></tr>';
        for (const [key, value] of Object.entries(entry.entry_data)) {
            let display = '';
            if (value === null || value === undefined) {
                display = '<em style="color:#9ca3af;">—</em>';
            } else if (typeof value === 'object' && value.lat) {
                display = '<a href="https://www.google.com/maps?q=' + value.lat + ',' + value.lng + '" target="_blank">' + value.lat + ', ' + value.lng + ' ↗</a>';
            } else if (Array.isArray(value)) {
                display = escHtml(value.join(', '));
            } else if (typeof value === 'string' && value.startsWith('data:image/')) {
                display = '<img src="' + value + '" style="max-width:200px;max-height:100px;border-radius:6px;" />';
            } else {
                display = escHtml(String(value));
            }
            // Resolve field_id to label, fallback to cleaned key
            const fieldLabel = labels[key] || key.replace(/^field_\d+_?\w*/, '').replace(/_/g, ' ') || key;
            html += '<tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:8px 0;font-weight:500;color:#374151;font-size:13px;">' + escHtml(fieldLabel) + '</td><td style="padding:8px 0;font-size:13px;">' + display + '</td></tr>';
        }
    }

    html += '</table>';
    body.html(html);
    modal.css('display', 'flex');
}

function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ── Leaflet Map ────────────────────────────────────────── */
function initLeafletMap(containerId, markers) {
    if (!markers.length) return;

    const map = L.map(containerId, { scrollWheelZoom: true });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
    }).addTo(map);

    const bounds = L.latLngBounds();
    const markerColor = '#667eea';

    markers.forEach(function(m) {
        const latlng = L.latLng(m.lat, m.lng);
        bounds.extend(latlng);

        const icon = L.divIcon({
            className: 'mfdc-map-marker',
            html: '<div style="background:' + markerColor + ';width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
        });

        const marker = L.marker(latlng, { icon: icon }).addTo(map);

        const popupHtml = '<div style="min-width:180px;font-family:-apple-system,sans-serif;">' +
            '<strong style="font-size:13px;">' + escHtml(m.title) + '</strong><br>' +
            '<span style="font-size:11px;color:#6b7280;">' + escHtml(m.date) + '</span><br>' +
            '<span style="font-size:11px;color:#6b7280;">' + m.lat.toFixed(5) + ', ' + m.lng.toFixed(5) + '</span><br>' +
            '<a href="#" class="mfdc-map-view-entry" data-id="' + m.id + '" style="font-size:12px;color:#667eea;font-weight:600;">View Details &rarr;</a>' +
            '</div>';

        marker.bindPopup(popupHtml);
    });

    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });

    // Handle "View Details" click inside popup
    map.on('popupopen', function() {
        jQuery('.mfdc-map-view-entry').off('click').on('click', function(e) {
            e.preventDefault();
            const entryId = jQuery(this).data('id');
            // Find the matching row's view button and trigger it
            const btn = jQuery('.view-entry').filter(function() {
                const d = jQuery(this).data('entry');
                return d && d.id == entryId;
            }).first();
            if (btn.length) {
                btn.trigger('click');
            }
        });
    });
}
