'use strict';

var L = require('leaflet'),

    Collection = require('mvc/Collection'),
    CollectionSelectBox = require('mvc/CollectionSelectBox'),
    ModalView = require('mvc/ModalView'),
    Model = require('mvc/Model'),
    View = require('mvc/View'),

    Util = require('util/Util');


var PARAMETERS = {
  'edition': [
    Model({id: 'E2014R1', value: 'NSHMP 2014 Revision 1'}),
    Model({id: 'E2008R3', value: 'NSHMP 2008 Revision 3'})
  ],
  'type': [
    Model({id: 'hazard', value: 'Hazard Contours'})
  ],
  'imt': [
    Model({id: 'PGA', value: 'Peak Ground Acceleration'}),
    Model({id: 'SA0P2', value: '0.20 Second Spectral Acceleration'}),
    Model({id: 'SA1P0', value: '1.00 Second Spectral Acceleration'})
  ],
  'period': [
    Model({id: '2P50', value: '2% in 50 Years'}),
    Model({id: '10P50', value: '10% in 50 Years'})
  ]
};

// --------------------------------------------------
// Private inner class
// --------------------------------------------------

var LayerChooser = function (params) {
  var _this,
      _initialize,

      _baseLayers,
      _baseLayerCollection,
      _datasets,
      _editionCollection,
      _editionView,
      _imtCollection,
      _imtView,
      _map,
      _modal,
      _overlays,
      _periodCollection,
      _periodView,
      _selectedOverlay,
      _typeCollection,
      _typeView,

      _getSelectedOverlay,
      _initCollections,
      _initViews,
      _onBaseLayerDeselect,
      _onBaseLayerSelect,
      _onDatasetChange,
      _onOverlayDeselect,
      _onOverlaySelect;


  _this = View(params);

  _initialize = function (params) {
    params = Util.extend({
      baseLayers: [
        {
          id: 1,
          value: 'Nat Geo',
          layer: L.tileLayer('http://services.arcgisonline.com/ArcGIS/rest/' +
              'services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x};.jpg')
        }
      ],
      overlays: [],
      datasets: []
    }, params);

    _baseLayers = params.baseLayers;
    _overlays = params.overlays;
    _datasets = params.datasets;

    _initCollections();
    _initViews();
    // _updateCollectionOptions();

    _modal = ModalView(_this.el, {
      title: 'Map Layer Chooser',
      buttons: [
        {
          callback: function () {
            _modal.hide();
          },
          classes: ['confirm'],
          text: 'Done'
        }
      ]
    });

    if (!_baseLayerCollection.getSelected()) {
      _baseLayerCollection.select(_baseLayerCollection.data()[0]);
    }
  };

  _getSelectedOverlay = function (edition, type, imt, period) {
    var i,
        len,
        overlay;

    if (!edition || !type || !imt || !period) {
      return null;
    }

    for (i = 0, len = _overlays.length; i < len; i++) {
      overlay = _overlays[i];

      if (overlay.edition === edition.get('id') &&
          overlay.type === type.get('id') &&
          overlay.imt === imt.get('id') &&
          overlay.period === period.get('id')) {
        return overlay;
      }
    }

    return null;
  };

  _initCollections = function () {
    _baseLayerCollection = Collection(_baseLayers.map(function (layer) {
      return Model(layer);
    }));

    _editionCollection = Collection(PARAMETERS.edition);
    _typeCollection = Collection(PARAMETERS.type);
    _imtCollection = Collection(PARAMETERS.imt);
    _periodCollection = Collection(PARAMETERS.period);

    // Select first option in each collection
    _baseLayerCollection.select(_baseLayerCollection.data()[0]);

    _editionCollection.select(_editionCollection.data()[0]);
    _typeCollection.select(_typeCollection.data()[0]);
    _imtCollection.select(_imtCollection.data()[0]);
    _periodCollection.select(_periodCollection.data()[0]);

    // Bind listeners
    _baseLayerCollection.on('select', _onBaseLayerSelect);
    _baseLayerCollection.on('deselect', _onBaseLayerDeselect);

    _editionCollection.on('select', _onOverlaySelect);
    _typeCollection.on('select', _onOverlaySelect);
    _imtCollection.on('select', _onOverlaySelect);
    _periodCollection.on('select', _onOverlaySelect);

    _editionCollection.on('select', _onOverlayDeselect);
    _typeCollection.on('select', _onOverlayDeselect);
    _imtCollection.on('select', _onOverlayDeselect);
    _periodCollection.on('select', _onOverlayDeselect);
  };

  _initViews = function () {
    var format,
        fragment,
        label;

    fragment = document.createDocumentFragment();
    format = function (item) {
      return item.get('value');
    };

    label = fragment.appendChild(document.createElement('h3'));
    label.innerHTML = 'Base Layer';

    label = fragment.appendChild(document.createElement('label'));
    _editionView = CollectionSelectBox({
      el: fragment.appendChild(document.createElement('select')),
      collection: _baseLayerCollection,
      format: format
    });

    label = fragment.appendChild(document.createElement('h3'));
    label.innerHTML = 'Overlays';

    label = fragment.appendChild(document.createElement('label'));
    label.innerHTML = 'Select data edition';
    _editionView = CollectionSelectBox({
      el: fragment.appendChild(document.createElement('select')),
      collection: _editionCollection,
      format: format
    });

    label = fragment.appendChild(document.createElement('label'));
    label.innerHTML = 'Select overlay type';
    _typeView = CollectionSelectBox({
      el: fragment.appendChild(document.createElement('select')),
      collection: _typeCollection,
      format: format
    });

    label = fragment.appendChild(document.createElement('label'));
    label.innerHTML = 'Select intensity measure type';
    _imtView = CollectionSelectBox({
      el: fragment.appendChild(document.createElement('select')),
      collection: _imtCollection,
      format: format
    });

    label = fragment.appendChild(document.createElement('label'));
    label.innerHTML = 'Select return period';
    _periodView = CollectionSelectBox({
      el: fragment.appendChild(document.createElement('select')),
      collection: _periodCollection,
      format: format
    });

    label = fragment.appendChild(document.createElement('h3'));
    label.innerHTML = 'Datasets';

    _datasets.forEach(function (dataset) {
      label = fragment.appendChild(document.createElement('label'));
      label.innerHTML = [
        '<input type="checkbox" id="dataset-', dataset.id, '"/> ',
        dataset.value
      ].join('');

      dataset.input = label.querySelector('input');
      dataset.input.addEventListener('change', _onDatasetChange);
    });

    _this.el.classList.add('vertical');
    _this.el.appendChild(fragment);
  };

  _onBaseLayerDeselect = function (layer) {
    var mapLayer = layer.get('layer');
    if (_map) {
      if (mapLayer._map) {
        _map.removeLayer(mapLayer);
      }
    }
  };

  _onBaseLayerSelect = function (layer) {
    var mapLayer = layer.get('layer');
    if (_map) {
      if (!mapLayer._map) {
        _map.addLayer(mapLayer);
      }
    }
  };

  _onDatasetChange = function () {
    var edition;

    edition = _editionCollection.getSelected();

    if (_map && edition) {
      edition = edition.get('id');

      _datasets.forEach(function (dataset) {
        if (dataset.input.checked) {
          // Make sure the corresponding layer is on the map
          dataset.overlays.forEach(function (overlay) {
            if (overlay.layer._map) {
              if (overlay.edition !== edition) {
                _map.removeLayer(overlay.layer);
              }
            } else {
              if (overlay.edition === edition) {
                _map.addLayer(overlay.layer);
              }
            }
          });
        } else {
          // Make sure all layers are off the map
          dataset.overlays.forEach(function (overlay) {
            if (overlay.layer._map) {
              _map.removeLayer(overlay.layer);
            }
          });
        }
      });
    }
  };

  _onOverlayDeselect = function () {
    // TODO :: Anything?
  };

  _onOverlaySelect = function () {
    if (_map) {
      if (_selectedOverlay) {
        _map.removeLayer(_selectedOverlay.layer);
      }

      _selectedOverlay = _getSelectedOverlay(
          _editionCollection.getSelected(),
          _typeCollection.getSelected(),
          _imtCollection.getSelected(),
          _periodCollection.getSelected()
        );

      if (_selectedOverlay && !_selectedOverlay._map) {
        _map.addLayer(_selectedOverlay.layer);
      }
    }

    // Update which overlays are shown by default
    _onDatasetChange();
  };


  _this.destroy = Util.compose(_this.destroy, function () {
    _this.setMap(null);

    _initialize = null;
    _this = null;
  });

  _this.hide = function () {
    _modal.hide();
  };

  _this.setMap = function (map) {
    _map = map;
    _onBaseLayerSelect(_baseLayerCollection.getSelected());
    _onOverlaySelect();
    // _onOverlaySelect();
  };

  _this.show = function () {
    _modal.show();
  };


  _initialize(params);
  params = null;
  return _this;
};


// --------------------------------------------------
// Public class
// --------------------------------------------------

var LayerControl = L.Control.extend({
  options: {
    position: 'topright'
  },

  initialize: function (params) {
    this._layerChooser = LayerChooser(params);
  },

  onAdd: function (map) {
    var container;

    this._map = map;
    this._layerChooser.setMap(map);

    container = L.DomUtil.create('div', 'hazard-layer-control');
    container.setAttribute('title', 'Select Overlays');

    L.DomEvent
        .on(container, 'mousedown dblclick', L.DomEvent.stopPropagation)
        .on(container, 'click', L.DomEvent.stop)
        .on(container, 'click', this._onClick, this);

    this._container = container;

    return container;
  },

  onRemove: function (/*map*/) {
    var container;

    this._layerChooser.setMap(null);

    container = this._container;
    L.DomEvent
        .off(container, 'mousedown dblclick', L.DomEvent.stopPropagation)
        .off(container, 'click', L.DomEvent.stop)
        .off(container, 'click', this._onClick, this);

    this._map = null;
  },

  _onClick: function (/*evt*/) {
    this._layerChooser.show();
  }
});

L.Control.hazardLayerControl = function (options) {
  return new LayerControl(options);
};

module.exports = LayerControl;
