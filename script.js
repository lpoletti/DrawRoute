var routeManager = null;

function RouteManager() {
    this.map = null;
    this.directionsService = null;
    this.directionsRenderer = null;
    this.geocoder = null;
    this.markers = [];
    this.currentRouteData = null;
    this.notes = {};
}

RouteManager.prototype.initMap = function() {
    var self = this;
    
    this.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 6,
        center: { lat: -14.2350, lng: -51.9253 }
    });

    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer({
        draggable: true,
        suppressMarkers: true
    });
    this.directionsRenderer.setMap(this.map);
    this.geocoder = new google.maps.Geocoder();

    document.getElementById('addWaypoint').onclick = function() { self.addWaypoint(); };
    document.getElementById('calculateRoute').onclick = function() { self.calculateRoute(); };
    document.getElementById('clearRoute').onclick = function() { self.clearRoute(); };
    document.getElementById('saveRoute').onclick = function() { self.saveRoute(); };
    document.getElementById('openInGoogleMaps').onclick = function() { self.openInGoogleMaps(); };
    document.getElementById('copyGoogleMapsLink').onclick = function() { self.copyLink(); };
    document.getElementById('exportJSON').onclick = function() { self.exportJSON(); };

    this.map.addListener('click', function(e) { self.handleMapClick(e); });
    this.setupAutocomplete('origin');
    this.setupAutocomplete('destination');
    this.loadFavorites();
};

RouteManager.prototype.setupAutocomplete = function(inputId) {
    var self = this;
    var input = document.getElementById(inputId);
    var autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['geocode'],
        componentRestrictions: { country: 'BR' }
    });

    autocomplete.addListener('place_changed', function() {
        var place = autocomplete.getPlace();
        if (place.geometry) {
            self.addMarker(inputId, place.geometry.location, place.formatted_address);
        }
    });

    input.oninput = function() {
        if (input.value.trim()) {
            self.geocodeAddress(input.value, inputId);
        }
    };
};

RouteManager.prototype.geocodeAddress = function(address, fieldId) {
    var self = this;
    this.geocoder.geocode({ address: address }, function(results, status) {
        if (status === 'OK' && results[0]) {
            self.addMarker(fieldId, results[0].geometry.location, address);
        }
    });
};

RouteManager.prototype.addMarker = function(fieldId, location, address) {
    for (var i = 0; i < this.markers.length; i++) {
        if (this.markers[i].id === fieldId) {
            this.markers[i].marker.setMap(null);
            this.markers.splice(i, 1);
            break;
        }
    }

    var color = '#ff9800';
    var label = '1';
    
    if (fieldId === 'origin') {
        color = '#4caf50';
        label = 'A';
    } else if (fieldId === 'destination') {
        color = '#f44336';
        label = 'B';
    } else {
        var inputs = document.querySelectorAll('#waypoints-list .waypoint-input');
        for (var j = 0; j < inputs.length; j++) {
            if (inputs[j].dataset.fieldId === fieldId) {
                label = String(j + 1);
                break;
            }
        }
    }

    var marker = new google.maps.Marker({
        position: location,
        map: this.map,
        title: address,
        label: { text: label, color: 'white', fontWeight: 'bold' },
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2,
            scale: 15
        },
        draggable: true
    });

    this.markers.push({ id: fieldId, marker: marker });
};

RouteManager.prototype.handleMapClick = function(event) {
    var self = this;
    var lat = event.latLng.lat();
    var lng = event.latLng.lng();
    
    this.geocoder.geocode({ location: { lat: lat, lng: lng } }, function(results, status) {
        if (status === 'OK' && results[0]) {
            self.addToNextField(results[0].formatted_address, event.latLng);
        }
    });
};

RouteManager.prototype.addToNextField = function(address, latLng) {
    var origin = document.getElementById('origin');
    if (!origin.value) {
        origin.value = address;
        this.addMarker('origin', latLng, address);
        return;
    }
    
    var inputs = document.querySelectorAll('#waypoints-list .waypoint-input');
    for (var i = 0; i < inputs.length; i++) {
        if (!inputs[i].value) {
            inputs[i].value = address;
            this.addMarker(inputs[i].dataset.fieldId, latLng, address);
            return;
        }
    }
    
    var destination = document.getElementById('destination');
    if (!destination.value) {
        destination.value = address;
        this.addMarker('destination', latLng, address);
    }
};

RouteManager.prototype.addWaypoint = function() {
    var list = document.getElementById('waypoints-list');
    var index = list.children.length;
    var fieldId = 'waypoint-' + index;
    
    var div = document.createElement('div');
    div.className = 'waypoint-item';
    div.innerHTML = 
        '<div class="waypoint-header">' +
        '<div class="waypoint-icon intermediate">' + (index + 1) + '</div>' +
        '<input type="text" class="waypoint-input" placeholder="Parada ' + (index + 1) + '" data-field-id="' + fieldId + '">' +
        '<button class="btn-note" onclick="routeManager.toggleNote(\'' + fieldId + '\')"><i class="fas fa-sticky-note"></i></button>' +
        '<button class="remove-waypoint" onclick="routeManager.removeWaypoint(this)"><i class="fas fa-times"></i></button>' +
        '</div>' +
        '<div class="waypoint-note" id="note-' + fieldId + '" style="display:none">' +
        '<textarea placeholder="Observação..." maxlength="500"></textarea>' +
        '<small class="char-count">0/500</small>' +
        '</div>';
    
    list.appendChild(div);
    
    var input = div.querySelector('.waypoint-input');
    var self = this;
    
    var autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['geocode'],
        componentRestrictions: { country: 'BR' }
    });

    autocomplete.addListener('place_changed', function() {
        var place = autocomplete.getPlace();
        if (place.geometry) {
            self.addMarker(fieldId, place.geometry.location, place.formatted_address);
        }
    });

    input.oninput = function() {
        if (input.value.trim()) {
            self.geocodeAddress(input.value, fieldId);
        }
    };

    var textarea = div.querySelector('textarea');
    var charCount = div.querySelector('.char-count');
    textarea.oninput = function() {
        charCount.textContent = textarea.value.length + '/500';
        self.notes[fieldId] = textarea.value;
    };
};

RouteManager.prototype.removeWaypoint = function(button) {
    var item = button.closest('.waypoint-item');
    var fieldId = item.querySelector('.waypoint-input').dataset.fieldId;
    
    for (var i = 0; i < this.markers.length; i++) {
        if (this.markers[i].id === fieldId) {
            this.markers[i].marker.setMap(null);
            this.markers.splice(i, 1);
            break;
        }
    }
    
    delete this.notes[fieldId];
    item.remove();
};

RouteManager.prototype.toggleNote = function(fieldId) {
    var note = document.getElementById('note-' + fieldId);
    if (note) {
        note.style.display = note.style.display === 'none' ? 'block' : 'none';
    }
};

RouteManager.prototype.calculateRoute = function() {
    var origin = document.getElementById('origin').value;
    var dest = document.getElementById('destination').value;
    
    if (!origin.trim() || !dest.trim()) {
        alert('Preencha origem e destino');
        return;
    }

    var inputs = document.querySelectorAll('#waypoints-list .waypoint-input');
    var waypoints = [];
    
    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].value.trim()) {
            waypoints.push({ location: inputs[i].value.trim(), stopover: true });
        }
    }

    var self = this;
    this.directionsService.route({
        origin: origin,
        destination: dest,
        waypoints: waypoints,
        travelMode: google.maps.TravelMode.DRIVING
    }, function(result, status) {
        if (status === 'OK') {
            self.directionsRenderer.setDirections(result);
            self.processRoute(result, origin, dest, waypoints);
        } else {
            alert('Erro ao calcular rota: ' + status);
        }
    });
};

RouteManager.prototype.processRoute = function(result, origin, dest, waypoints) {
    var route = result.routes[0];
    var totalDist = 0;
    var totalTime = 0;

    for (var i = 0; i < route.legs.length; i++) {
        totalDist += route.legs[i].distance.value;
        totalTime += route.legs[i].duration.value;
    }

    this.currentRouteData = {
        origin: {
            address: origin,
            coordinates: {
                lat: route.legs[0].start_location.lat(),
                lng: route.legs[0].start_location.lng()
            },
        },
        waypoints: [],
        destination: {
            address: dest,
            coordinates: {
                lat: route.legs[route.legs.length - 1].end_location.lat(),
                lng: route.legs[route.legs.length - 1].end_location.lng()
            },
        },
        summary: {
            distanceText: (totalDist / 1000).toFixed(1) + ' km',
            durationText: Math.floor(totalTime / 3600) + 'h ' + Math.floor((totalTime % 3600) / 60) + 'min'
        }
    };

    for (var j = 0; j < waypoints.length; j++) {
        var fieldId = 'waypoint-' + j;
        if (j < route.legs.length - 1) {
            this.currentRouteData.waypoints.push({
                address: waypoints[j].location,
                coordinates: {
                    lat: route.legs[j].end_location.lat(),
                    lng: route.legs[j].end_location.lng()
                },
            });
        }
    }

    document.getElementById('totalDistance').textContent = this.currentRouteData.summary.distanceText;
    document.getElementById('totalDuration').textContent = this.currentRouteData.summary.durationText;
    document.getElementById('routeInfo').style.display = 'block';
};

RouteManager.prototype.generateURL = function(data) {
    if (!data) data = this.currentRouteData;
    if (!data) return null;

    var waypoints = [];
    for (var i = 0; i < data.waypoints.length; i++) {
        waypoints.push(data.waypoints[i].coordinates.lat + ',' + data.waypoints[i].coordinates.lng);
    }

    var url = 'https://www.google.com/maps/dir/?api=1';
    url += '&origin=' + data.origin.coordinates.lat + ',' + data.origin.coordinates.lng;
    url += '&destination=' + data.destination.coordinates.lat + ',' + data.destination.coordinates.lng;
    
    if (waypoints.length > 0) {
        url += '&waypoints=' + waypoints.join('|');
    }
    
    url += '&travelmode=driving';
    return url;
};

RouteManager.prototype.openInGoogleMaps = function() {
    var url = this.generateURL();
    if (url) {
        window.open(url, '_blank');
    } else {
        alert('Calcule uma rota primeiro');
    }
};

RouteManager.prototype.copyLink = function() {
    var url = this.generateURL();
    if (url) {
        navigator.clipboard.writeText(url).then(function() {
            alert('Link copiado!');
        });
    } else {
        alert('Calcule uma rota primeiro');
    }
};

RouteManager.prototype.exportJSON = function() {
    if (!this.currentRouteData) {
        alert('Calcule uma rota primeiro');
        return;
    }

    var data = JSON.stringify({
        origin: this.currentRouteData.origin,
        waypoints: this.currentRouteData.waypoints,
        destination: this.currentRouteData.destination,
        summary: this.currentRouteData.summary,
        googleMapsUrl: this.generateURL(),
        exportedAt: new Date().toISOString()
    }, null, 2);

    var blob = new Blob([data], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'rota_' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    alert('JSON exportado!');
};

RouteManager.prototype.clearRoute = function() {
    document.getElementById('origin').value = '';
    document.getElementById('destination').value = '';
    document.getElementById('waypoints-list').innerHTML = '';
    
    for (var i = 0; i < this.markers.length; i++) {
        this.markers[i].marker.setMap(null);
    }
    this.markers = [];
    
    this.directionsRenderer.setDirections({ routes: [] });
    document.getElementById('routeInfo').style.display = 'none';
    this.currentRouteData = null;
    this.notes = {};
};

RouteManager.prototype.saveRoute = function() {
    if (!this.currentRouteData) {
        alert('Calcule uma rota primeiro');
        return;
    }

    var name = prompt('Nome da rota:');
    if (!name) return;

    var saved = {
        id: Date.now(),
        name: name,
        origin: this.currentRouteData.origin,
        waypoints: this.currentRouteData.waypoints,
        destination: this.currentRouteData.destination,
        summary: this.currentRouteData.summary,
        savedAt: new Date().toLocaleString()
    };

    favorites.push(saved);
    localStorage.setItem('favoriteRoutes', JSON.stringify(favorites));
    
    this.loadFavorites();
    alert('Rota salva!');
};

RouteManager.prototype.loadFavorites = function() {
    var list = document.getElementById('favoritesList');
    list.innerHTML = '';
    
    if (favorites.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:1rem">Nenhuma rota salva</p>';
        return;
    }
    
    for (var i = 0; i < favorites.length; i++) {
        var r = favorites[i];
        var div = document.createElement('div');
        div.className = 'favorite-item';
        div.innerHTML = 
            '<div class="favorite-header">' +
            '<div class="favorite-name">' + r.name + '</div>' +
            '<div class="favorite-date">' + r.savedAt + '</div>' +
            '</div>' +
            '<div class="favorite-actions">' +
            '<button class="favorite-btn load" onclick="routeManager.loadRoute(' + r.id + ')"><i class="fas fa-play"></i> Carregar</button>' +
            '<button class="favorite-btn google" onclick="routeManager.openSaved(' + r.id + ')"><i class="fab fa-google"></i> Maps</button>' +
            '<button class="favorite-btn info" onclick="routeManager.showDetails(' + r.id + ')"><i class="fas fa-info-circle"></i> Info</button>' +
            '<button class="favorite-btn delete" onclick="routeManager.deleteRoute(' + r.id + ')"><i class="fas fa-trash"></i></button>' +
            '</div>';
        list.appendChild(div);
    }
};

RouteManager.prototype.openSaved = function(id) {
    for (var i = 0; i < favorites.length; i++) {
        if (favorites[i].id === id) {
            var url = this.generateURL(favorites[i]);
            if (url) window.open(url, '_blank');
            return;
        }
    }
};

RouteManager.prototype.showDetails = function(id) {
    var route = null;
    for (var i = 0; i < favorites.length; i++) {
        if (favorites[i].id === id) {
            route = favorites[i];
            break;
        }
    }
    if (!route) return;

    var html = '<div class="route-point origin">' +
        '<div class="route-point-header"><div class="route-point-icon origin">A</div><span class="route-point-title">Origem</span></div>' +
        '<div class="route-point-address">' + route.origin.address + '</div>' +
        (route.origin.note ? '<div class="route-point-note">' + route.origin.note + '</div>' : '') +
        '</div>';

    for (var j = 0; j < route.waypoints.length; j++) {
        html += '<div class="route-point waypoint">' +
            '<div class="route-point-header"><div class="route-point-icon waypoint">' + (j + 1) + '</div><span class="route-point-title">Parada ' + (j + 1) + '</span></div>' +
            '<div class="route-point-address">' + route.waypoints[j].address + '</div>' +
            (route.waypoints[j].note ? '<div class="route-point-note">' + route.waypoints[j].note + '</div>' : '') +
            '</div>';
    }

    html += '<div class="route-point destination">' +
        '<div class="route-point-header"><div class="route-point-icon destination">B</div><span class="route-point-title">Destino</span></div>' +
        '<div class="route-point-address">' + route.destination.address + '</div>' +
        (route.destination.note ? '<div class="route-point-note">' + route.destination.note + '</div>' : '') +
        '</div>';

    html += '<div style="margin-top:1.5rem;padding:1rem;background:#e3f2fd;border-radius:8px">' +
        '<h4 style="margin-bottom:0.5rem;color:#1976d2">Resumo</h4>' +
        '<p style="margin:0.25rem 0"><strong>Distância:</strong> ' + route.summary.distanceText + '</p>' +
        '<p style="margin:0.25rem 0"><strong>Tempo:</strong> ' + route.summary.durationText + '</p>' +
        '</div>';

    document.getElementById('modalRouteName').textContent = route.name;
    document.getElementById('modalRouteDetails').innerHTML = html;
    
    var self = this;
    document.getElementById('modalOpenGoogleMaps').onclick = function() {
        self.openSaved(id);
    };
    
    document.getElementById('routeDetailsModal').style.display = 'block';
};

RouteManager.prototype.closeRouteModal = function() {
    document.getElementById('routeDetailsModal').style.display = 'none';
};

RouteManager.prototype.loadRoute = function(id) {
    var route = null;
    for (var i = 0; i < favorites.length; i++) {
        if (favorites[i].id === id) {
            route = favorites[i];
            break;
        }
    }
    if (!route) return;

    this.clearRoute();

    document.getElementById('origin').value = route.origin.address;
    this.addMarker('origin', new google.maps.LatLng(route.origin.coordinates.lat, route.origin.coordinates.lng), route.origin.address);

    var self = this;
    for (var j = 0; j < route.waypoints.length; j++) {
        (function(index, wp) {
            self.addWaypoint();
            setTimeout(function() {
                var inputs = document.querySelectorAll('#waypoints-list .waypoint-input');
                if (inputs[index]) {
                    inputs[index].value = wp.address;
                    self.addMarker(inputs[index].dataset.fieldId, new google.maps.LatLng(wp.coordinates.lat, wp.coordinates.lng), wp.address);
                    if (wp.note) {
                        self.notes[inputs[index].dataset.fieldId] = wp.note;
                        var textarea = document.querySelector('#note-' + inputs[index].dataset.fieldId + ' textarea');
                        if (textarea) textarea.value = wp.note;
                    }
                }
            }, 150 * (index + 1));
        })(j, route.waypoints[j]);
    }

    setTimeout(function() {
        document.getElementById('destination').value = route.destination.address;
        self.addMarker('destination', new google.maps.LatLng(route.destination.coordinates.lat, route.destination.coordinates.lng), route.destination.address);
        
        setTimeout(function() {
            self.calculateRoute();
        }, 500);
    }, 150 * (route.waypoints.length + 1));
};

RouteManager.prototype.deleteRoute = function(id) {
    if (!confirm('Excluir rota?')) return;
    
    var filtered = [];
    for (var i = 0; i < favorites.length; i++) {
        if (favorites[i].id !== id) {
            filtered.push(favorites[i]);
        }
    }
    localStorage.setItem('favoriteRoutes', JSON.stringify(filtered));
    this.loadFavorites();
};

function initMap() {
    routeManager = new RouteManager();
    routeManager.initMap();
}

window.initMap = initMap;

window.onclick = function(event) {
    if (event.target === document.getElementById('routeDetailsModal') && routeManager) {
        routeManager.closeRouteModal();
    }
};