'use strict';

/* Controllers */

angular.module('weatherApp.controllers', [])
  .controller('AppCtrl', function ($scope, $http) {
    $scope.cities = [];
    $scope.citiesPaginated = [];
    $scope.account = {};
    $scope.noCities = false;
    $scope.offset = 0;
    $scope.limit = 6;
    $scope.loading = false;

    $('#subscribeForm').validator({
      custom: {
        city: function() {
          if (!$scope.account.locationName) {
            return "A city needs to be chosen. Click Search and choose a city."
          }
        }
      }
    });
    $scope.search = function() {
      $scope.noCities = false;
      $scope.loading = true;

      $http.get('/api/cities', {params : {
        query : $scope.citiesSearch
      }
      }).
      success(function (data, status, headers, config) {
        $scope.loading = false;

        if (data && data.length > 0) {
          $scope.cities = data;
          $scope.citiesPaginated = $scope.cities.slice($scope.offset, $scope.offset + $scope.limit)
        } else {
          $scope.noCities = true
        }
      }).
      error(function (data, status, headers, config) {
        $scope.loading = false;

      });
    };
    $scope.nextPage = function() {
      if ($scope.offset + $scope.limit < $scope.cities.length) {
        $scope.offset += $scope.limit;
        $scope.citiesPaginated = $scope.cities.slice($scope.offset, $scope.offset + $scope.limit)
      }
    };
    $scope.previousPage = function() {
      if ($scope.offset > 0) {
        $scope.offset -= $scope.limit;
        $scope.citiesPaginated = $scope.cities.slice($scope.offset, $scope.offset + $scope.limit)
      }
    };


    $scope.selectCity = function(city) {
      $scope.account.locationLink = city.l;
      $scope.account.locationName = city.name;
      $scope.citiesSearch = city.name;
      $scope.cities = [];
      $scope.citiesPaginated = [];
      $scope.city = city;
      $('#subscribeForm').validator('validate')
    };

    $scope.createAccount = function() {
      $http.post('/api/account', $scope.account, {}).
      success(function (data, status, headers, config) {
        $scope.success = true
      }).
      error(function (data, status, headers, config) {
      });
    };
  });
