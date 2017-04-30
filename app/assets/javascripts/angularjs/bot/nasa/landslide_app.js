(function() {
  var town_name_mapping ={
    '臺北市': 'taipei',
    '新北市': 'new_taipei',
    '桃園市': 'taoyuan',
    '臺中市': 'taichung',
    '臺南市': 'tainan',
    '高雄市': 'kaohsiung',
    '新竹市': 'hsinchu_city',
    '新竹縣': 'hsinchu_county',
    '嘉義市': 'chiayi_city',
    '嘉義縣': 'chiayi_county',
    '基隆市': 'keelung',
    /****************/
    '宜蘭縣': 'yilan',
    '雲林縣': 'yunlin',
    '彰化縣': 'changhua',
    '連江縣': 'lienjiang',
    '花蓮縣': 'hualien',
    '臺東縣': 'taitung',
    '南投縣': 'nantou',
    '屏東縣': 'pingtung',
    '金門縣': 'kinmen',
    '苗栗縣': 'miaoli',
  };

  var twgeojson = [];

  angularApplication.module('nasaLandslideApp',
    ['leaflet-directive', 'ngGeolocation', 'cgNotify', 'nvd3', 'ngTable', 'ui.toggle'])

  .filter('percentage', function() {
    return function(input) {
      if (isNaN(input)) {
        return input;
      }
      return Math.floor(input * 100 + 0.5) + '%';
    };
  })

  .filter('numberFloor', function() {
    return function( input ) {
      if( input && !isNaN( input ) )
        return Math.floor( input );
      else
        return input;
    };
  })

  .controller('mapViewCtrl', ['$scope', '$http', 'leafletData', '$timeout', '$q', '$geolocation', '$filter', '$modal', 'leafletData', 'notify', 'ngTableParams',

    function($scope, $http, leafletData, $timeout, $q, $geolocation, $filter, $modal, leafletData, notify, ngTableParams) {
      $scope.renderHeatMap = function() {
        var locations = [];

        Disasters.forEach(function(disaster) {
          if (disaster.lng && disaster.lat) {
            locations.push([disaster.lat, disaster.lng]);
          }
        });

        $scope.layers.overlays = {
          heat: {
            name: 'Heat Map',
            type: 'heat',
            data: locations,
            layerOptions: {
              radius: 20,
              blur: 10,
              minOpacity: 0.4
            },
            visible: true
          }
        };
      };

      $scope.renderMarker = function() {
        $scope.markers = Disasters.map(function(disaster) {
            var maker = {
              layer: 'disasters',
              lat: disaster.lat,
              lng: disaster.lng,
              id:  disaster.id,
              message:
                '<div class="gm-style-iw" style="">\
                 <div style="display: inline-block; overflow: auto; max-height: 670px; min-width: 301px;">\
                 <div style="overflow: auto;">\
                 <h3 class="gmap_address house-detail-title">' + disaster.name + '</h3>\
                 <ul class="gmap_list">\
                  <li><span>縣市</span>' + disaster.county + '</li>\
                  <li><span>鄉鎮</span>' + disaster.town + '</li>\
                  <li><span>村里</span>' + disaster.village + '</li>\
                  <li><span>災害類別</span>' + (disaster.is_erosion ? '土石流 ' : '') + (disaster.is_landslide ? '坍方 ' : '')  + (disaster.is_debris ? '倒塌 ' : '') + '</li>\
                  <li><span>雨量</span>' + (disaster.rain ? disaster.rain + 'mm' : '') + '</li>\
                  <li><span>發生時間</span>' + moment(disaster.occured_at).format('YYYY/MM/DD a') + '</li>\
                 </ul>\
                 <div class="text-center" style="display: inline-block; width: 100%; padding: 10px 10px 10px 10px;">\
                   <button class="btn btn-xs btn-primary" onclick="window.openPdfView(\'' + disaster.file_url + '\');">災害報告</button>\
                   <button class="btn btn-xs btn-primary" onclick="window.openStreetView(' + disaster.lat + ',' + disaster.lng + ');">街景</button></div>\
                 </div></div></div>',
              icon: {
                type: 'awesomeMarker',
                icon: 'exclamation-triangle',
                markerColor: 'orange',
                prefix: 'fa'
              }
            };

            return maker;
          });
      };

      $scope.heatMapOn = false;

      $scope.toggleHeatMap = function() {
        $scope.heatMapOn = !$scope.heatMapOn;

        if ($scope.heatMapOn) {
          $scope.markers = [];
          $scope.renderHeatMap();
        } else {
          $scope.layers.overlays = {
              disasters: {
                  name: "disasters layer",
                  type: "markercluster",
                  visible: true
              },
              draw: {
                  name: 'draw',
                  type: 'group',
                  visible: true,
                  layerParams: {
                      showOnSelector: false
                  }
              }
          },
          $scope.renderMarker();
        }
      };

      $timeout(function(){
        $scope.toggleHeatMap();
      }, 1000);

      $scope.show_query = false;
      $scope.toggleQuery = function() {
        $scope.show_query = !$scope.show_query;
      };

      $scope.tab_status = 'query_filter';
      $scope.setTab = function(status) {
        //for nvd3 resize to proper size;
        $timeout(function () {
          window.dispatchEvent(new Event('resize'));
        }, 100);

        $scope.tab_status = status;
      };

      $scope.form_model = {};

      $scope.cities = [];
      $scope.towns = [];
      for (var city in town_name_mapping) {
        $scope.cities.push({name: city});
      }

      $scope.room_types = [
        {name: '1房', value: 'x = 1'},
        {name: '2房', value: 'x = 2'},
        {name: '3房', value: 'x = 3'},
        {name: '4房', value: 'x = 4'},
        {name: '5房以上', value: 'x > 5'},
      ];

      $scope.area_types = [
        {name: '低於10坪', value: '10 > x'},
        {name: '10－20坪', value: '10 <= x AND x < 20'},
        {name: '20－30坪', value: '20 <= x AND x < 30'},
        {name: '30－40坪', value: '30 <= x AND x < 40'},
        {name: '40－50坪', value: '40 <= x AND x < 50'},
        {name: '50－60坪', value: '50 <= x AND x < 60'},
        {name: '60－70坪', value: '60 <= x AND x < 70'},
        {name: '70－80坪', value: '70 <= x AND x < 80'},
        {name: '80－90坪', value: '80 <= x AND x < 90'},
        {name: '90－100坪', value: '90 <= x AND x < 100'},
        {name: '100坪以上', value: '100 <= x'},
      ];


      $scope.total_price_types = [
        {name: '低於300萬', value: '3000000 > x'},
        {name: '300~500萬', value: '5000000 <= x AND x < 7000000'},
        {name: '700~1000萬', value: '7000000 <= x AND x < 10000000'},
        {name: '1000－1500萬', value: '10000000 <= x AND x < 15000000'},
        {name: '1500－2000萬', value: '15000000 <= x AND x < 20000000'},
        {name: '2000－3000萬', value: '20000000 <= x AND x < 30000000'},
        {name: '3000－4000萬', value: '30000000 <= x AND x < 40000000'},
        {name: '4000－5000萬', value: '40000000 <= x AND x < 50000000'},
        {name: '5000－6000萬', value: '50000000 <= x AND x < 60000000'},
        {name: '6000－7000萬', value: '60000000 <= x AND x < 70000000'},
        {name: '7000－8000萬', value: '70000000 <= x AND x < 80000000'},
        {name: '8000萬以上', value: '80000000 <= x'},
      ];

      $scope.unit_price_types = [
        {name: '低於10萬(每坪)', value: '10 > x'},
        {name: '10－20萬', value: '10 <= x AND x < 20'},
        {name: '20－30萬', value: '20 <= x AND x < 30'},
        {name: '30－40萬', value: '30 <= x AND x < 40'},
        {name: '40－50萬', value: '40 <= x AND x < 50'},
        {name: '50－60萬', value: '50 <= x AND x < 60'},
        {name: '60－70萬', value: '60 <= x AND x < 70'},
        {name: '70－80萬', value: '70 <= x AND x < 80'},
        {name: '80－90萬', value: '80 <= x AND x < 90'},
        {name: '90－100萬', value: '90 <= x AND x < 100'},
        {name: '100－200萬', value: '100 <= x AND x < 200'},
        {name: '200萬以上', value: '200 <= x'},
      ];

      $scope.age_types = [
        {name: '低於1年', value: '1 > x'},
        {name: '5－10年', value: '5 <= x AND x < 10'},
        {name: '10－20年', value: '10 <= x AND x < 20'},
        {name: '20－30年', value: '20 <= x AND x < 30'},
        {name: '30－40年', value: '30 <= x AND x < 40'},
        {name: '40－50年', value: '40 <= x AND x < 50'},
        {name: '50－60年', value: '50 <= x AND x < 60'},
        {name: '60年以上', value: '60 <= x'},
      ];

      $scope.usage_types = [
        {name: '工業用', value: '工業用'},
        {name: '住家用', value: '住家用'},
        {name: '商業用', value: '商業用'},
        {name: '停車空間', value: '停車空間'},
        {name: '其他', value: '其他'},
      ];

      $scope.selected_county = null;
      $scope.selected_town   = null;
      $scope.selected_house  = null;
      $scope.geojson = {};
      $scope.bounds  = null;
      $scope.canceller = null;

      $scope.load_houses = false;
      $scope.load_house  = false;

      var layerDict = {
        googleTerrain: {
          name: 'Google Terrain',
          layerType: 'TERRAIN',
          type: 'google'
        },
        googleHybrid: {
          name: 'Google Hybrid',
          layerType: 'HYBRID',
          type: 'google'
        }
      };

      angular.extend($scope, {
          center: {
            lat: 25.047923,
            lng: 121.5170907,
            zoom: 16
          },
          taiwan: {
            lat: 23.58412603264412,
            lng: 121.13525390625,
            zoom: 9
          },
          controls: {
            draw: {
              //marker: false,
              //polyline: false,
              circle: false
            },
            edit: false
          },
          defaults: {
            scrollWheelZoom: false
          },
          layers: {
            baselayers: layerDict,
            overlays: {
                houses: {
                    name: "houses layer",
                    type: "markercluster",
                    visible: true
                },
                draw: {
                    name: 'draw',
                    type: 'group',
                    visible: true,
                    layerParams: {
                        showOnSelector: false
                    }
                }
            },

          }
      });

      $scope.using_drawing = false;
      $scope.cleanDraw = function() {
        $scope.geojson = {};
        drawnItems.clearLayers();
        $scope.using_drawing = false;

        $scope.loadHousesWithQuery();
      };

      notify.config({
        startTop: 80,
        duration: 1000
      });

      $scope.show_draw_tooltip = true;

      $scope.opened = {
        transact_from: false,
        transact_to: false
      }

      // DOM 2 Events
      var dispatchMouseEvent = function(target, var_args) {
        var e = document.createEvent("MouseEvents");
        // If you need clientX, clientY, etc., you can call
        // initMouseEvent instead of initEvent
        e.initEvent.apply(e, Array.prototype.slice.call(arguments, 1));
        target.dispatchEvent(e);
      };

      var fireClick = function(element) {
        dispatchMouseEvent(element, 'mouseover', true, true);
        dispatchMouseEvent(element, 'mousedown', true, true);
        dispatchMouseEvent(element, 'click', true, true);
        dispatchMouseEvent(element, 'mouseup', true, true);
      };

      $scope.drawCircle = function() {
        notify({ message:'請開始在地圖上繪製', position: 'right' });
        var element = $('.leaflet-draw-draw-marker')[0];
        fireClick(element);
      };

      $scope.drawRet = function() {
        notify.closeAll();
        notify({ message:'請開始在地圖上繪製', position: 'right' });
        var element = $('.leaflet-draw-draw-rectangle')[0];
        fireClick(element);
      };

      $scope.drawPolygon = function() {
        notify.closeAll();
        notify({ message:'請開始在地圖上繪製', position: 'right' });
        var element = $('.leaflet-draw-draw-polygon')[0];
        fireClick(element);
      };

      $scope.drawLine = function() {
        notify.closeAll();
        notify({ message:'請開始在地圖上繪製', position: 'right' });
        var element = $('.leaflet-draw-draw-polyline')[0];
        fireClick(element);
      };

      var drawnItems = null;
      leafletData.getMap().then(function(map) {
           leafletData.getLayers().then(function(baselayers) {
              drawnItems = baselayers.overlays.draw;

              map.on('draw:created', function (e) {
                var layer = e.layer;
                $scope.geojson = {};
                drawnItems.clearLayers();

                drawnItems.addLayer(layer);
                $scope.using_drawing = true;

                console.log(JSON.stringify(layer.toGeoJSON()));

                var polygon = layer.toGeoJSON().geometry;
                polygon['crs'] = {"type":"name", "properties":{"name":"EPSG:4326"}};

                if (polygon.type == 'Point' || polygon.type == 'LineString') {
                  var buff = turf.buffer(polygon, 50, 'meters');
                  console.log(buff);

                  $scope.geojson = {
                    data: buff,
                    style: {
                      fillColor: "rgb(240, 110, 170)",
                      weight: 2,
                      opacity: 1,
                      color: 'rgb(240, 110, 170)',
                      dashArray: '3',
                      fillOpacity: 0.25
                    }
                  };
                };

                $scope.form_model = {};
                $scope.loadHousesWithQuery(polygon);
              });
           });
       });

      $scope.loadTownGeoJson = function() {
        var towns = [];

        for (var key in town_name_mapping) {
          towns.push(town_name_mapping[key]);
        }

        for (var index in towns) {
          var town = towns[index];

          (function(town){
            $http.get('/static-geojson/district/' + town + '.json')
            .success(function(data, status) {
              twgeojson[town] = data;
            });
          })(town);
        }
      }

      $scope.loadCountyGeoJson = function() {
        $http.get("/static-geojson/taiwan.min.json")
        .success(function(data, status) {
          twgeojson['taiwan'] = data;
          $scope.resetSelector();

          // $scope.load_houses = true;

          // Locate browser location
          // $geolocation.getCurrentPosition({
          //   timeout: 60000
          // }).then(function(position) {
          //   $http.post(Routes.find_village_by_location_path(), {
          //     location: {
          //       lat: position.coords.latitude,
          //       lng: position.coords.longitude
          //     }
          //   }).success(function(data, status) {
          //     if (data.success) {
          //       $scope.geojson = {};
          //
          //       $scope.selected_county = data.county;
          //       $scope.selected_town = data.district;
          //       $scope.preview_feature = null;
          //
          //       $scope.load_houses = false;
          //
          //       $scope.taiwan = {
          //         lat: position.coords.latitude,
          //         lng: position.coords.longitude,
          //         zoom: 16
          //       };
          //     }
          //   });
          // });
        });
      };

      $scope.resetSelector = function() {
        if ($scope.canceller) {
          $scope.canceller.resolve();
          $scope.canceller = null;
        }

        $scope.selected_county = null;
        $scope.selected_town = null;
        $scope.houses_count = 0;
        $scope.markers = [];

        $scope.show_marker_detail = false;
        $scope.toggle_show_marker_detail = function() {
          $scope.show_marker_detail = !$scope.show_marker_detail;
        };

        leafletData.getMap().then(function(map){
          map.setView({
            lat: 23.58412603264412,
            lng: 121.13525390625
          }, 8);
        });

        $scope.geojson = {
          data: twgeojson['taiwan'],
          style: {
            weight: 2,
            opacity: 1,
            color: '#ef783d'
          }
        };
      };

      $scope.loadHousesWithTown = function(town) {
        $scope.load_houses = true;
        $http.post(Routes.find_house_by_town_path(), {
          town: town
        }).success(function(data, status) {
          $scope.markers = data.houses.map(function(house) {
              var maker = {
                layer: 'houses',
                lat: house.lat,
                lng: house.lon,
                id:  house.id,
                message:
                  '<div class="gm-style-iw" style="">\
                   <div style="display: inline-block; overflow: auto; max-height: 670px; min-width: 301px;">\
                   <div style="overflow: auto;">\
                   <h3 class="gmap_address house-detail-title">{{selected_house["地址"]}}</h3>\
                   <ul class="gmap_list">\
                    <li><span>建物型態</span>{{(selected_house["建物型態"] ? selected_house["建物型態"] : "")}}</li>\
                    <li><span>交易時屋齡</span>{{(selected_house["屋齡"] ? selected_house["屋齡"] : "")}}</li>\
                    <li><span>交易單價</span>{{(selected_house["單價"] ? to_filter_unit_price(selected_house["單價"] ) + "萬/坪" : "")}}</li>\
                    <li><span>房屋格局</span>{{selected_house["房"]}}房{{selected_house["廳"]}}廳{{selected_house["衛"]}}衛</li>\
                    <li><span>交易總價</span>{{(selected_house["實價"] ? to_filter_unit_price(selected_house["實價"]) + "萬" : "")}}</li>\
                    <li><span>坪數</span>{{(selected_house["面積"] ? selected_house["面積"] : "")}} 坪</li>\
                    <li><span>交易時間</span>{{(selected_house["交易時間"] ? selected_house["交易時間"] : "")}}</li>\
                    <li><span>車位</span>{{to_not_zero_boolean(selected_house["交易車位數量"]) ? "有" : "無"}}</li>\
                   </ul>\
                   <div ng-if="show_marker_detail">\
                    <ul class="gmap_list">\
                     <li>&nbsp;</li><li>&nbsp;</li>\
                     <h3 class="gmap_address house-detail-title">土地資料{{(selected_house["交易土地數量"] ? selected_house["交易土地數量"] : "0")}}筆</h3>\
                     <li><span>移轉面積</span>{{selected_house["土地移轉面積"] ? selected_house["土地移轉面積"] : ""}} 坪</li>\
                     <li><span>使用分區或編定</span>{{selected_house["使用分區或編定"] ? selected_house["使用分區或編定"] : ""}}</li>\
                     <li><span>非都市土地使用分區</span>{{selected_house["非都市土地使用分區"] ? selected_house["非都市土地使用分區"] : ""}}</li>\
                     <li><span>非都市土地使用地</span>{{selected_house["非都市土地使用地"] ? selected_house["非都市土地使用地"] : ""}}</li>\
                     \
                     <li>&nbsp;</li><li>&nbsp;</li>\
                     <h3 class="gmap_address house-detail-title">建物資料{{(selected_house["交易建物數量"] ? selected_house["交易建物數量"] : "0")}}筆</h3>\
                     <li><span>所在樓層 / 總樓層</span>{{(selected_house["移轉層次"] ? selected_house["移轉層次"] : "")}} / {{(selected_house["總樓層數"] ? selected_house["總樓層數"] : "")}}</li>\
                     <li><span>主要用途</span>{{(selected_house["主要用途"] ? selected_house["主要用途"] : "")}}</li>\
                     <li><span>主要建材</span>{{(selected_house["主要建材"] ? selected_house["主要建材"] : "")}}</li>\
                     <li><span>建築完成年月</span>{{(selected_house["建築完成年月"] ? selected_house["建築完成年月"] : "")}}</li>\
                     \
                     <li>&nbsp;</li><li>&nbsp;</li>\
                     <h3 class="gmap_address house-detail-title">車位資料{{(selected_house["交易車位數量"] ? selected_house["交易車位數量"] : "0")}}筆</h3>\
                     <li><span>車位類別</span>{{(selected_house["車位類別"] ? selected_house["車位類別"] : "")}}</li>\
                     <li><span>車位移轉面積</span>{{(selected_house["車位移轉面積"] ? selected_house["車位移轉面積"] : "")}}</li>\
                     <li><span>車位總價</span>{{(selected_house["車位總價"] ? to_filter_unit_price(selected_house["車位總價"]) + "萬" : "")}}</li>\
                     \
                     <li>&nbsp;</li>\
                     <h3 class="gmap_address house-detail-title">備註欄</h3>\
                     {{(selected_house["備註"] ? selected_house["備註"] : "無備註")}}\
                    </ul>\
                   </div>\
                   <div class="text-center" style="display: inline-block; width: 100%; padding: 10px 10px 10px 10px;">\
                     <button ng-if="!show_marker_detail" class="btn btn-primary btn-xs" ng-click="toggle_show_marker_detail()">詳細內容</button>\
                     <button ng-if="show_marker_detail" class="btn btn-primary btn-xs" ng-click="toggle_show_marker_detail()">隱藏</button>\
                     <button class="btn btn-xs btn-primary" onclick="window.openStreetView(' + house.lat + ',' + house.lon + ');">街景</button></div>\
                   </div></div></div>',
                icon: {
                  type: 'awesomeMarker',
                  icon: 'home',
                  markerColor: 'red'
                }
              };

              return maker;
            });
          $scope.load_houses = false;
        });
      };

      $scope.to_filter_unit_price = function(p) {
        return $filter('currency')(p / 10000, "", 0);
      };

      $scope.to_human_boolean = function(value) {
        if (value == null) {
          return "";
        } else {
          if (value == true) {
            return "有";
          } else {
            return "無";
          }
        }
      };

      $scope.to_not_zero_boolean = function(value) {
        if (parseInt(value)!=NaN && parseInt(value)!=0) {
          return true;
        } else {
          return false;
        }
      };

      $scope.openStreetView = function(lat, lng) {
        var modalInstance = $modal.open({
          size: 'lg',
          animation: true,
          templateUrl: 'streetViewModal.html',
          controller: 'streetViewModalInstanceCtrl',
          resolve: {
            lat: function () {
              return lat;
            },
            lng: function () {
              return lng;
            }
          }
        });
      };

      $scope.openPdfView = function(disaster) {
        var modalInstance = $modal.open({
          size: 'lg',
          animation: true,
          templateUrl: 'pdfViewModal.html',
          controller: 'pdfViewModalInstanceCtrl',
          resolve: {
            disaster: function () {
              return disaster;
            }
          }
        });
      };

      window.openStreetView = function(lat, lng) {
        $scope.openStreetView(lat, lng);
      }

      window.openPdfView = function(disaster) {
        $scope.openPdfView(disaster);
      }

      $scope.tableResultParams = null;
      $scope.loadHousesWithQuery = function(polygon) {
        var preSelectId = null;

        if ($scope.bounds && $scope.selected_town) {
          if ($scope.canceller) {
            $scope.canceller.resolve();
          }

          $scope.canceller = $q.defer();
          $scope.load_houses = true;

          $http({
            url: Routes.find_raw_house_by_bounding_box_path(),
            method: 'POST',
            getMessageScope: function () { return $scope; },
            data: {
              filter: $scope.form_model,
              county: $scope.selected_county,
              town: $scope.selected_town,
              box: $scope.bounds,
              polygon: (polygon) ? polygon : null
            },
            timeout: $scope.canceller.promise
          })
          .success(function(data, status) {
            $scope.tableResultParams = new ngTableParams({
              page: 1,
              count: 10
            }, {
              total: data.houses_count, // length of data
              getData: function ($defer, params) {
                $http.post(Routes.list_raw_houses_by_bounding_box_path(), {
                  filter: $scope.form_model,
                  county: $scope.selected_county,
                  town: $scope.selected_town,
                  box: $scope.bounds,
                  polygon: (polygon) ? polygon : null,

                  page: params.page(),
                  per_page: params.count(),
                  order: params.orderBy()[0]
                }).success(function(data) {
                  $defer.resolve(data.houses);
                });
              }
            })

            $scope.ave_unit_price = Math.round(data.ave_unit_price*3.3058/10000);
            $scope.ave_total_price = Math.round(data.ave_total_price/10000);

            if (data.houses_count < 1500) {
              var new_markers = data.houses.map(function(house) {
                  var maker = {
                    layer: 'houses',
                    lat: house.lat,
                    lng: house.lon,
                    id:  house.id,
                    popupOptions: {
                      autoPanPadding: L.point(5, -200),
                    },
                    getMessageScope: function () { return $scope; },
                    message:
                      '<div class="gm-style-iw" style="">\
                       <div style="display: inline-block; overflow: auto; max-height: 670px; min-width: 301px;">\
                       <div style="overflow: auto;">\
                       <h3 class="gmap_address house-detail-title">{{selected_house["地址"]}}</h3>\
                       <ul class="gmap_list">\
                        <li><span>建物型態</span>{{(selected_house["建物型態"] ? selected_house["建物型態"] : "")}}</li>\
                        <li><span>交易時屋齡</span>{{(selected_house["屋齡"] ? selected_house["屋齡"] : "")}}</li>\
                        <li><span>交易單價</span>{{(selected_house["單價"] ? to_filter_unit_price(selected_house["單價"] ) + "萬/坪" : "")}}</li>\
                        <li><span>房屋格局</span>{{selected_house["房"]}}房{{selected_house["廳"]}}廳{{selected_house["衛"]}}衛</li>\
                        <li><span>交易總價</span>{{(selected_house["實價"] ? to_filter_unit_price(selected_house["實價"]) + "萬" : "")}}</li>\
                        <li><span>坪數</span>{{(selected_house["面積"] ? selected_house["面積"] : "")}} 坪</li>\
                        <li><span>交易時間</span>{{(selected_house["交易時間"] ? selected_house["交易時間"] : "")}}</li>\
                        <li><span>車位</span>{{to_not_zero_boolean(selected_house["交易車位數量"]) ? "有" : "無"}}</li>\
                       </ul>\
                       <div ng-if="show_marker_detail">\
                        <ul class="gmap_list">\
                         <li>&nbsp;</li><li>&nbsp;</li>\
                         <h3 class="gmap_address house-detail-title">土地資料{{(selected_house["交易土地數量"] ? selected_house["交易土地數量"] : "0")}}筆</h3>\
                         <li><span>移轉面積</span>{{selected_house["土地移轉面積"] ? selected_house["土地移轉面積"] : ""}} 坪</li>\
                         <li><span>使用分區或編定</span>{{selected_house["使用分區或編定"] ? selected_house["使用分區或編定"] : ""}}</li>\
                         <li><span>非都市土地使用分區</span>{{selected_house["非都市土地使用分區"] ? selected_house["非都市土地使用分區"] : ""}}</li>\
                         <li><span>非都市土地使用地</span>{{selected_house["非都市土地使用地"] ? selected_house["非都市土地使用地"] : ""}}</li>\
                         \
                         <li>&nbsp;</li><li>&nbsp;</li>\
                         <h3 class="gmap_address house-detail-title">建物資料{{(selected_house["交易建物數量"] ? selected_house["交易建物數量"] : "0")}}筆</h3>\
                         <li><span>所在樓層 / 總樓層</span>{{(selected_house["移轉層次"] ? selected_house["移轉層次"] : "")}} / {{(selected_house["總樓層數"] ? selected_house["總樓層數"] : "")}}</li>\
                         <li><span>主要用途</span>{{(selected_house["主要用途"] ? selected_house["主要用途"] : "")}}</li>\
                         <li><span>主要建材</span>{{(selected_house["主要建材"] ? selected_house["主要建材"] : "")}}</li>\
                         <li><span>建築完成年月</span>{{(selected_house["建築完成年月"] ? selected_house["建築完成年月"] : "")}}</li>\
                         \
                         <li>&nbsp;</li><li>&nbsp;</li>\
                         <h3 class="gmap_address house-detail-title">車位資料{{(selected_house["交易車位數量"] ? selected_house["交易車位數量"] : "0")}}筆</h3>\
                         <li><span>車位類別</span>{{(selected_house["車位類別"] ? selected_house["車位類別"] : "")}}</li>\
                         <li><span>車位移轉面積</span>{{(selected_house["車位移轉面積"] ? selected_house["車位移轉面積"] : "")}}</li>\
                         <li><span>車位總價</span>{{(selected_house["車位總價"] ? to_filter_unit_price(selected_house["車位總價"]) + "萬" : "")}}</li>\
                         \
                         <li>&nbsp;</li>\
                         <h3 class="gmap_address house-detail-title">備註欄</h3>\
                         {{(selected_house["備註"] ? selected_house["備註"] : "無備註")}}\
                        </ul>\
                       </div>\
                       <div class="text-center" style="display: inline-block; width: 100%; padding: 10px 10px 10px 10px;">\
                         <button ng-if="!show_marker_detail" class="btn btn-primary btn-xs" ng-click="toggle_show_marker_detail()">詳細內容</button>\
                         <button ng-if="show_marker_detail" class="btn btn-primary btn-xs" ng-click="toggle_show_marker_detail()">隱藏</button>\
                         <button class="btn btn-xs btn-primary" onclick="window.openStreetView(' + house.lat + ',' + house.lon + ');">街景</button></div>\
                       </div></div></div>',
                    icon: {
                      type: 'awesomeMarker',
                      icon: 'home',
                      markerColor: 'red'
                    }
                  };

                  return maker;
                });

                var found, i, j, collected_markers = [];

                if (polygon) {
                  $scope.markers = [];
                  console.log(new_markers);

                  $timeout(function() {
                    $scope.markers = new_markers;
                    console.log($scope.markers);
                  }, 300);
                } else {
                  for (i = 0; i < $scope.markers.length; i++) {
                    if ($scope.markers[i].count == null) {
                      collected_markers.push($scope.markers[i]);
                    }
                  }

                  $scope.markers = collected_markers;

                  for (j = 0; j < new_markers.length; j++) {
                    found = false;
                    for (i = 0; i < $scope.markers.length; i++) {
                      if (new_markers[j].id == $scope.markers[i].id) {
                        found = true;
                      }
                    }

                    if (!found) {
                      $scope.markers.push(new_markers[j]);
                    }
                  }
                }
            } else {
              var cluster_as_makers = [];

              data.houses_clustering.forEach(function(clustering) {
                  if (clustering[1] > 0) {
                    var c = ' marker-cluster-';
                		if (clustering[1] < 1000) {
                			c += 'medium';
                		} else {
                			c += 'large';
                		}

                    cluster_as_makers.push({
                      lat: parseFloat(clustering[3]),
                      lng: parseFloat(clustering[2]),
                      count: clustering[1],
                      icon: {
                        type: 'div',
                        html: '<div><span>' + clustering[1] + '</span></div>',
                        className: 'marker-cluster' + c,
                        iconSize: [40, 40]
                      }
                    });
                  }
                });
              $scope.markers = cluster_as_makers;
            }

            $scope.houses_count = data.houses_count;
            $scope.request_canceler = null;
            $scope.load_houses = false;
          })
          .error(function(data, status, headers, config) {
            //
          });
        }
      };

      $scope.openMarkerDetail = function() {
        var modalInstance = $modal.open({
          size: 'lg',
          animation: true,
          templateUrl: 'markerDetail.html',
          controller: 'modalInstanceCtrl',
          resolve: {
            selected_house: function () {
              return angular.copy($scope.selected_house);
            }
          }
        });
      };

      $scope.relocated_town = '';
      $scope.relocateTown = function(bound) {
        if (!$scope.selected_town) { return; }

        var point = {
          lat: (bound.northEast.lat + bound.southWest.lat) / 2,
          lng: (bound.northEast.lng + bound.southWest.lng) / 2
        };

        var town_file_name = town_name_mapping[$scope.selected_county];
        twgeojson[town_file_name].features.forEach(function(feature) {
          var flag = gju.pointInPolygon({"type":"Point","coordinates":[point.lng, point.lat]}, feature.geometry)
          if (flag) {
            if ($scope.relocated_town != feature.properties['TOWN']) {
              $scope.relocated_town = feature.properties['TOWN'];
              $scope.selected_town = feature.properties['TOWN'];
            }
          }
        });
      };

      $scope.$watch('bounds', function(newValue, oldValue) {
        if (!$scope.stopRefreshMap) {
          if ($scope.using_drawing) {
            return;
          }

          $scope.loadHousesWithQuery();
          $scope.relocateTown(newValue);
        }
      }, true);

/*
      $scope.$watch('form_model.address', function(newValue, oldValue) {
        $scope.loadHousesWithQuery();
      }, true);

      $scope.$watch('form_model.rooms', function(newValue, oldValue) {
        $scope.loadHousesWithQuery();
      }, true);

      $scope.$watch('form_model.area_floor', function(newValue, oldValue) {
        $scope.loadHousesWithQuery();
      }, true);

      $scope.$watch('form_model.area_ceil', function(newValue, oldValue) {
        $scope.loadHousesWithQuery();
      }, true);

      $scope.$watch('form_model.house_type', function(newValue, oldValue) {
        $scope.loadHousesWithQuery();
      }, true);

      $scope.$watch('form_model.built_at_floor', function(newValue, oldValue) {
        $scope.loadHousesWithQuery();
      }, true);

      $scope.$watch('form_model.built_at_ceil', function(newValue, oldValue) {
        $scope.loadHousesWithQuery();
      }, true);
*/
      $scope.submitFilter = function() {
        $scope.markers = [];
        //$scope.loadHousesWithQuery();
        $scope.cleanDraw();
      };

      $scope.$watch('selected_town', function(newValue, oldValue) {
        if (!$scope.selected_town || $scope.relocated_town == $scope.selected_town) {
          return;
        }

        $scope.relocated_town = $scope.selected_town;

        var feature = null;
        var town_name = town_name_mapping[$scope.selected_county];
        for (var i in twgeojson[town_name].features) {
          var f = twgeojson[town_name].features[i];
          if (f.properties['TOWN'] == $scope.selected_town) {
            var bbox = turf.bbox(f.geometry);
            leafletData.getMap().then(function(map) {

              var southWest = L.latLng(bbox[1], bbox[0]),
                  northEast = L.latLng(bbox[3], bbox[2]),
                  bounds = L.latLngBounds(southWest, northEast);

              map.fitBounds(bounds);

              $scope.cleanDraw();
            });

            $timeout(function() {
              $scope.geojson = {};
              $scope.preview_feature = null;
            }, 250);
          }
        }
      }, true);

      $scope.$watch('selected_county', function(newValue, oldValue) {
        if (!$scope.selected_county) {
          return;
        }

        $scope.markers = [];
        $scope.selected_town = null;

        var feature = null;
        for (var i in twgeojson['taiwan'].features) {
          var f = twgeojson['taiwan'].features[i];
          if (f.properties['COUNTY'] == $scope.selected_county) {
            var bbox = turf.bbox(f.geometry);
            leafletData.getMap().then(function(map) {

              var southWest = L.latLng(bbox[1], bbox[0]),
                  northEast = L.latLng(bbox[3], bbox[2]),
                  bounds = L.latLngBounds(southWest, northEast);

              map.fitBounds(bounds);
            });

            $timeout(function() {
              var town_name = town_name_mapping[$scope.selected_county];
              $scope.geojson = {
                data: twgeojson[town_name],
                style: {
                  fillColor: "#93c3c6",
                  weight: 2,
                  opacity: 1,
                  color: 'white',
                  dashArray: '3',
                  fillOpacity: 0.8
                }
              };

              $scope.towns = twgeojson[town_name].features.map(function(feature) {
                return {
                  name: feature.properties['TOWN']
                }
              })
            }, 250);
          }
        }
      }, true);


      $scope.$on("leafletDirectiveMap.geojsonClick", function(ev, featureSelected, leafletEvent) {
        if ($scope.clicktimer) {
          // when dblclick event traget
          $timeout.cancel($scope.clicktimer);
          $scope.clicktimer = null;

          leafletData.getMap().then(function(map){
            map.setView(leafletEvent.target.getBounds().getCenter(), map.getZoom() + 1);
          });
        } else {
          // when click event traget

          $scope.clicktimer = $timeout( function(){
            $scope.clicktimer = null;

            var clicked_feature = leafletEvent.target.feature.properties;

            if (clicked_feature['TOWN']) {
              $scope.selected_town = clicked_feature['TOWN'];
              $scope.preview_feature = null;
            } else if (clicked_feature['COUNTY']) {
              $scope.selected_county = clicked_feature['COUNTY'];
              $scope.preview_feature = null;
            }

          }, 250);
        }
      });

      $scope.getSelectedHouseRow = function() {

      };

      $scope.clearSelectedHouse = function() {
        $scope.selected_house = null;
        $scope.selected_house_rows = null;
      };

      $scope.stopRefreshMap = false;
      $scope.$on('leafletDirectiveMarker.click', function (e, args) {
        $scope.load_house = true;

        if ($scope.markers[args.modelName].id) {
          $scope.stopRefreshMap = true;
          $timeout(function() {
            $scope.stopRefreshMap = false;
          }, 2000);

          $scope.selected_house = null;
          $http.post(Routes.find_raw_house_by_id_path(), {
            id: $scope.markers[args.modelName].id
          }).success(function(data, status) {
            $scope.selected_house = data.house;
            $scope.selected_house_rows = $scope.getSelectedHouseRow();

            // console.log(data.house);

            $scope.load_house = false;
          });


        } else if ($scope.markers[args.modelName].count) {
          leafletData.getMap().then(function(map){
            map.setView({
              lat: $scope.markers[args.modelName].lat,
              lng: $scope.markers[args.modelName].lng
            }, map.getZoom() + 1);
          });
        }

      });

      $scope.$on("leafletDirectiveMap.geojsonMouseover", function(ev, featureSelected, leafletEvent) {
        var clicked_feature = leafletEvent.target.feature.properties;

        if (clicked_feature['TOWN']) {
          $scope.preview_feature = clicked_feature['TOWN'];
        } else if (clicked_feature['COUNTY']) {
          $scope.preview_feature = clicked_feature['COUNTY'];
        }
      });

      $scope.loadCountyGeoJson();
      $scope.loadTownGeoJson();


    }
  ])

  .controller('streetViewModalInstanceCtrl', ['$scope', '$modalInstance', 'lat', 'lng',
    function($scope, $modalInstance, lat, lng) {

      $scope.close = function () {
        $modalInstance.dismiss('cancel');
      };

      var house = {lat: lat, lng: lng};

      setTimeout(function() {
        var panorama = new google.maps.StreetViewPanorama(
        document.getElementById('pano'), {
          position: house,
          pov: {
            heading: 34,
            pitch: 10
          }
        });
      }, 300);
    }
  ])

  .controller('pdfViewModalInstanceCtrl', ['$scope', '$modalInstance', 'disaster',
    function($scope, $modalInstance, disaster) {

      $scope.close = function () {
        $modalInstance.dismiss('cancel');
      };

      setTimeout(function() {
        $('#PDF_VIEW').attr('src', disaster)
      }, 300);
    }
  ])

  .controller('priceVolumeCtrl', ['$scope', '$http', '$timeout',
    function($scope, $http, $timeout) {

      $scope.nvd3_year_month = [];

      $scope.nvd3_options = {
        chart: {
          type: 'linePlusBarChart',
          height: 350,
          margin: {
            top: 20,
            right: 50,
            bottom: 50,
            left: 50
          },
          color: ['#2ca02c', 'darkred'],
          xAxis: {
            showMaxMin: true,
            rotateLabels: -20,
            tickFormat: function(d){
              return $scope.nvd3_year_month[d];
            }
          },
          x2Axis: {
            showMaxMin: true,
            tickFormat: function(d){
              return $scope.nvd3_year_month[d];
            }
          },
          y1Axis: {
            tickFormat: function(d){
              return d;
            }
          },
          y2Axis: {
            tickFormat: function(d){ //轉坪
              return d3.format(',.0f')(d*3.30579 / 10000) + '萬';
            }
          },
          focusEnable: true,
        }
      };

      $scope.nvd3_data = [];
      $scope.selected_house_type = "所有";

      $scope.changeHouseType = function(type, trade_type='一般') {
        $scope.selected_trade_type = trade_type;
        $scope.selected_house_type = type;

        $scope.nvd3_data = [];
        $timeout(function() {
          var key_name = 'median_price';
          if(type == '透天厝') {
            key_name = 'median_total_price'
            $scope.nvd3_options.chart.y2Axis.tickFormat = function(d) {
              return d3.format(',.0f')(d / 10000) + '萬';
            };
          } else {
            $scope.nvd3_options.chart.y2Axis.tickFormat = function(d) {
              return d3.format(',.0f')(d*3.30579 / 10000) + '萬';
            };
          }

          $scope.nvd3_data.push({
            key: '交易量'+' '+trade_type,
            values: $scope.raw_data[trade_type][type]['volume'],
            bar: true,
          });
          $scope.nvd3_data.push({
            key: '價格'+' '+trade_type,
            values: $scope.raw_data[trade_type][type][key_name],
            bar: false,
          });

          var length = $scope.raw_data[trade_type][type][key_name].length;
          $scope.current_price = $scope.raw_data[trade_type][type][key_name][length-1].y;
          $scope.current_volume = $scope.raw_data[trade_type][type]['volume'][length-1].y;
          $scope.compare_last_month_price = parseFloat($scope.current_price-$scope.raw_data[trade_type][type][key_name][length-2].y)/$scope.raw_data[trade_type][type][key_name][length-2].y;
          $scope.compare_last_year_price = parseFloat($scope.current_price-$scope.raw_data[trade_type][type][key_name][length-13].y)/$scope.raw_data[trade_type][type][key_name][length-13].y;
          $scope.compare_last_month_volume = parseFloat($scope.current_volume-$scope.raw_data[trade_type][type]['volume'][length-2].y)/$scope.raw_data[trade_type][type]['volume'][length-2].y;
          $scope.compare_last_year_volume = parseFloat($scope.current_volume-$scope.raw_data[trade_type][type]['volume'][length-13].y)/$scope.raw_data[trade_type][type]['volume'][length-13].y;
        }, 100);
      };


      $scope.$watch('selected_county', function(){
        if($scope.selected_county != null) {
          var values = {"一般":{}, "增建": {}, "親友": {}};
          var trade_types = ["一般", "增建", "親友"]

          for(var trade_type_idx in trade_types) {
            var trade_type = trade_types[trade_type_idx];

            //we use callback inside, so need to use closure to bind variable
            (function(trade_type) {
              Papa.parse("/static-file/price_volume_reports/" + $scope.selected_county.replace('臺', '台') + '_' + trade_type + ".csv", {
                download: true,
                complete: function(results) {
                  for (var i in results.data) {
                    i = parseInt(i);
                    if (i > 0) {
                      var date  = parseInt(results.data[i][0]);

                      var price_volume = {};
                      var types = ["所有", "公寓(5樓含以下無電梯)", "華廈(10層含以下有電梯)", "住宅大樓(11層含以上有電梯)", "套房(1房1廳1衛)", "透天厝"];
                      for(var idx in types) {
                        var type = types[idx];
                        price_volume[type] = {
                          'volume': parseInt(results.data[i][idx*5+1]),
                          'median_total_price': parseFloat(results.data[i][idx*5+2]),
                          'median_price': parseFloat(results.data[i][idx*5+3]),
                          'min_price': parseFloat(results.data[i][idx*5+4]),
                          'max_price': parseFloat(results.data[i][idx*5+5]),
                        };
                      }

                      var month = date % 100;
                      var year = (date - month) / 100;

                      if(trade_type_idx == 0) {
                        $scope.nvd3_year_month.push(year + '年' + month + '月');
                      }

                      for(var idx in types) {
                        var type = types[idx];
                        if(!(type in values[trade_type])) {
                          values[trade_type][type] = {'volume': [], 'median_total_price': [], 'median_price': [], 'min_price': [], 'max_price': []};
                        }
                        if(!isNaN(price_volume[type]['volume'])) {
                          values[trade_type][type]['volume'].push({x: i-1, y: price_volume[type]['volume']});
                          values[trade_type][type]['median_total_price'].push({x: i-1, y: price_volume[type]['median_total_price']});
                          values[trade_type][type]['median_price'].push({x: i-1, y: price_volume[type]['median_price']});
                          values[trade_type][type]['min_price'].push({x: i-1, y: price_volume[type]['min_price']});
                          values[trade_type][type]['max_price'].push({x: i-1, y: price_volume[type]['max_price']});
                        }
                      }

                    }
                  }// end for(var idx in types)
                },
                error: function() {
                  //
                }
              });
            })(trade_type);

          } //for(var trade_type_idx in trade_types)
          console.log(values);
          $scope.raw_data = values;

          $scope.changeHouseType("所有");
        } //if($scope.selected_county != null) {

      }); //$scope.$watch('selected_county'
    }
  ]);
})();
