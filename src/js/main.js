(function ($, window, document) {
  var autocomplete, geocoder;
  var currentCity;
  var isValidLocation = false;
  var countryCode;

  function initAutocomplete() {
    // Initialize Autocomplete
    autocomplete = new google.maps.places.Autocomplete(
      (document.getElementById('city-input')),
      { types: ['(cities)'] }
    );

    // Initialize Geocoder
    geocoder = new google.maps.Geocoder();

    // Set Autocomplete to slelect first item on 'enter'
    var cityInput = document.getElementById('city-input');
    selectFirstOnEnter(cityInput);

    // Prevent form to submit when user presses 'enter'
    google.maps.event.addDomListener(cityInput, 'keydown', function(event) {
      if (event.keyCode === 13) {
          event.preventDefault();
      }
    });

    // Fade in video background
    $("#background-video").css('opacity', 0).animate( { opacity: 1 }, 2500);

    // Listen to place change on Autocomplete
    autocomplete.addListener('place_changed', getPlace);

    // Open custom dropdown
    $('#purpose-label').on('click', function () {
      $('#purpose-list').toggleClass('dropdown-open');
    });

    // Stop scrolling animation when user scrolls
    $("html, body").bind("scroll mousedown DOMMouseScroll mousewheel keyup", function(){
      $('html, body').stop();
    });

    //Check to see if the window is top if not then display button
    $(window).scroll(function(){
      if ($(this).scrollTop() > $(window).height() * 1.5) {
        $('#top-btn').fadeIn();
      } else {
        $('#top-btn').fadeOut();
      }
    });

    //Click event to scroll to top
    $('#top-btn').click(function(){
      $('html, body').animate({scrollTop : 0}, 800);
      return false;
    });

    // Close custom dropdown when clicked outside
    $(window).click(function (event) {
      if (!event.target.matches('#purpose-label') &&
          !event.target.matches('#purpose-text') &&
          !event.target.matches('#dropdown-icon')) {
        if($('#purpose-list').hasClass('dropdown-open')) {
          $('#purpose-list').removeClass('dropdown-open');
        }
      }
    });

    $('.dropdown-item').click(function () {
      var genreId = $(this).data('genreid');
      var purpose = $(this).text();
      $('#purpose-label').data('genreid', genreId);
      $('#purpose-text').text(purpose);
    });

    $('#locate-btn').click(function (event) {
      event.preventDefault();
      getCurrentPosition();
    });

    $('#search-btn').click(function (event) {
      event.preventDefault();
      $('#search-form').submit();
    });

    $('#search-form').submit(function (event) {
      event.preventDefault();
      searchApps();
    });
  }

  function getPlace() {
    // Get the place details from the autocomplete object.
    var place = autocomplete.getPlace();

    // Check if the place is valid
    if (!place.geometry) {
      isValidLocation = false;
      return;
    }

    // Place is valid
    isValidLocation = true;

    var formattedAddress = place.formatted_address;
    var addressComponents = place.address_components;
    var formattedCityText = formatCityInputText(formattedAddress, addressComponents, false);
    fillInCityInput(formattedCityText);
  }

  function getCurrentPosition() {
    if (currentCity) {
      fillInCityInput(currentCity);
      return;
    }

    if (navigator.geolocation) {
      $('#city-input').attr('placeholder', 'Locating...');
      $('#city-input').val('');
      $('#city-input').prop('disabled', true);

      navigator.geolocation.getCurrentPosition(function(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        var latlng = new google.maps.LatLng(lat, lng);

        // Get city name of the geolocation
        geocoder.geocode({latLng: latlng}, function(results, status) {
          if (status == google.maps.GeocoderStatus.OK) {
            if (results[1]) {
              $.each(results, function(i, addressItem) {
                isValidLocation = true;

                if (addressItem.types[0] == 'locality') {
                  var formattedAddress = addressItem.formatted_address;
                  var addressComponents = addressItem.address_components;
                  var formattedCityText = formatCityInputText(formattedAddress, addressComponents, true);
                  fillInCityInput(formattedCityText);
                  $('#city-input').prop('disabled', false);
                  return;
                }
              });
            } else {
              showMessage('No results found.');
              $('#city-input').prop('disabled', false);
              $('#city-input').attr('placeholder', '');
              isValidLocation = false;
            }
          } else {
            alert("Geocoder failed due to: " + status);
            $('#city-input').prop('disabled', false);
            $('#city-input').attr('placeholder', '');
            isValidLocation = false;
          }
        });

      }, function(error) {
        $('#city-input').prop('disabled', false);
        $('#city-input').attr('placeholder', '');
        showMessage('Your location detection is disabled.');
        isValidLocation = false;
      });
    } else {
      showMessage('Your browser doen not support geolocation.');
    }
  }

  // Format city string to display for the US and other countries
  function formatCityInputText(formattedAddress, addressComponents, isCurrent) {
    var city = addressComponents[0].long_name;
    var lastComponent = addressComponents[addressComponents.length - 1].short_name;
    var forthComponent;
    if (addressComponents[3]) {
      forthComponent = addressComponents[3].short_name;
    }

    var cityInputText;
    if (lastComponent === 'US' || forthComponent === 'US') {
      var stateCode = addressComponents[2].short_name;
      cityInputText = formattedAddress.substring(0, formattedAddress.indexOf(',') + 4);
    } else if (lastComponent === 'GB') {
      cityInputText = formattedAddress;
    } else {
      cityInputText = city + ', ' + lastComponent;
    }

    if (isCurrent) {
      currentCity = cityInputText;
    }

    // Store the country code
    countryCode = lastComponent.toLowerCase();
    // If last component is not the coutry code
    if (countryCode.length > 2) {
      countryCode = addressComponents[addressComponents.length - 2].short_name;
    }

    return cityInputText;
  }

  function fillInCityInput(cityInputText) {
    $('#city-input').animate({color: 'transparent'}, 300, function () {
      $('#city-input').val(cityInputText).animate({color: '#FAFAFA'}, 300, function () {
        searchApps();
      });
    });
  }

  function searchApps() {
    // Return if the place/search-term is not valid
    if (!isValidLocation) {
      showMessage('Please enter a valid location in the search bar');
      return;
    }

    $('#apps').show();
    $('#apps-list').empty();
    hideMessage();
    $('.loader').css("display", "block");
    scrollTo('#apps');

    requestApps();
  }

  function requestApps() {
    var term;
    var genreId = $('#purpose-label').data('genreid');
    var cityInputValue =  $('#city-input').val();

    if (cityInputValue.indexOf(',') ===  -1) {
      term = cityInputValue;
    } else {
      term = cityInputValue.substring(0, cityInputValue.indexOf(','));
    }

    term = encodeURIComponent(term);

    var requestUrl = 'https://itunes.apple.com/search?' +
                      'term=' + term +
                      '&genreId=' + genreId +
                      '&country=' + countryCode +
                      '&lang=' + 'en_us' +
                      '&media=software&entity=software&sort=recent&callback=?';

    $.getJSON(requestUrl, function(data){
      if (data) {
        results = data.results;
        var rankedList = rankApps(results, term);
        populateList(rankedList);
      }

      $('.loader').css("display", "none");
      scrollTo('#apps');
    });
  }

  // Apps ranking algorithm
  function rankApps(results, term) {
    var city = term;
    var cityRegex = new RegExp(city, "gi");
    var purpose = $('#purpose-text').text();
    var purposeRegex = new RegExp(purpose, "gi");

    for (var i = 0; i < results.length; i++) {
      var app = results[i];

      var appName = app.trackName;
      var appDescription = String(app.description);
      // Get occurence of city name in app title and app description
      var cityInName = (appName.match(cityRegex) || []).length;
      var cityInDescription = (appDescription.match(cityRegex) || []).length;
      // Get occurence of purpose/app-category in app title and app description
      var purposeInName = (appName.match(purposeRegex) || []).length;
      var purposeInDescription = (appDescription.match(purposeRegex) || []).length;

      // Calculate different ratings on scale of 0 to 5
      // And assign weight to each rating
      // App Store user rating
      var userRating = app.averageUserRating;
      var u  = app.userRatingCount;
      // App Store ranking in search results
      var appleRating = (results.length - i) / results.length * 5;
      var a = 100;
      // City relevance in app name and descrption
      var cityRating = 3.5 + cityInName + cityInDescription / 2;
      var c = 200;
      // Purpose relevance in app name and description
      var purposeRating = 3.5 + purposeInName + purposeInDescription / 2;
      var p = 100;

      if (cityRating > 5) {
        cityRating = 5;
      }
      if (purposeRating > 5) {
        purposeRating = 5;
      }

      // Calculate the weighted rating
      // Check if there's a user rating
      if (userRating) {
        app.weightedRating = (userRating * u +  appleRating * a + cityRating * c + purposeRating * p) / (u + a + c + p);
      } else {
        app.weightedRating = (appleRating * a + cityRating * c + purposeRating * p) / (a + c + p);
      }
    }

    // Rank the apps by the 'weightedRating'
    rankedList = results.slice(0);
    rankedList.sort(function(a, b) {
      return b.weightedRating - a.weightedRating;
    });

    return rankedList;
  }

  // Display apps in apps list
  function populateList(list) {
    hideMessage();

    if (!list.length) {
      showMessage('No app found. Please try another populated city area nearby.');
      return;
    }

    for (var i = 0; i < list.length; i++) {
      var app = list[i];

      $('#apps-list').append(
        $('<article/>', {'class': 'app-item'}).append(
          $('<img/>', {'class': 'app-img'}).attr('src', app.artworkUrl100)
        ).append(
          $('<p/>', {'class': 'app-title', text: app.trackName})
        ).append(
          $('<p>', {'class': 'app-rating ', text: "City Apps Rating: " + app.weightedRating.toFixed(2)})
        ).append(
          $('<p/>', {'class': 'app-description ', text: app.description})
        ).append(
          $('<p/>', {'class': 'app-download '}).append(
            $('<a/>', {'class': 'download-btn'}).attr({'href': app.trackViewUrl, 'target': '_blank', 'role': 'button'}).html('Download &raquo;')
          )
        )
        .append($('<br>'))
        .append($('<hr>'))
        .append($('<br>'))
      );
    }
  }

  function showMessage(message) {
    $('#apps').show();
    $('#apps-list').empty();
    $('#message').show().text(message);
    scrollTo('#message');
  }

  function hideMessage() {
    $('#message').hide();
  }

  function scrollTo(tag) {
    if (tag === 'bottom') {

    } else {
      $('html, body').stop();
      $('html, body').animate({
          scrollTop: $(tag).offset().top
      }, 800);
    }
  }

  /*
    Autocomplete selects first option on 'enter'
    From: Stack Overflow
    By: Basj
    Source: https://stackoverflow.com/questions/14601655/google-places-autocomplete-pick-first-result-on-enter-key
  */
  function selectFirstOnEnter(input) {      // store the original event binding function
      var _addEventListener = (input.addEventListener) ? input.addEventListener : input.attachEvent;
      function addEventListenerWrapper(type, listener) { // Simulate a 'down arrow' keypress on hitting 'return' when no pac suggestion is selected, and then trigger the original listener.
      if (type == "keydown") {
        var orig_listener = listener;
        listener = function (event) {
        var suggestion_selected = $(".pac-item-selected").length > 0;
          if (event.which == 13 && !suggestion_selected) { var simulated_downarrow = $.Event("keydown", {keyCode:40, which:40}); orig_listener.apply(input, [simulated_downarrow]); }
          orig_listener.apply(input, [event]);
        };
      }
      _addEventListener.apply(input, [type, listener]); // add the modified listener
    }
    if (input.addEventListener) { input.addEventListener = addEventListenerWrapper; } else if (input.attachEvent) { input.attachEvent = addEventListenerWrapper; }
  }

  // Set initAutocomplete in the revealing module
  revealingModule = { initAutocomplete: initAutocomplete };

})(window.jQuery, window, document);
