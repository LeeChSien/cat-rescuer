class Bot::Nasa::Resolver::AddressWithLocation < Bot::Resolver::Base
  def dialog
    { string: '請告訴我你所在的地點' }
  end

  def feed_response(answer)
    county = town = address = route = street_number = nil

    geocoding = Geocoder.search(answer, language: 'zh-TW')
    for component in geocoding.first.data['address_components']
      if component['types'].include?('route')
        route = component['long_name']
      elsif component['types'].include?('street_number')
        street_number = component['long_name']
      elsif component['types'].include?('administrative_area_level_1')
        county = component['long_name']
      elsif component['types'].include?('administrative_area_level_2') and county == nil
        county = component['long_name']
      elsif component['types'].include?('administrative_area_level_3')
        town = component['long_name']
      end
    end

    if !county || !town || !route || !street_number
      yield false, { string: '哎呀，你輸入的地點我們無法判斷，請再告訴我一次' }, nil
    else
      address = route + street_number + '號'

      point = EscapePoint.find_nearest(geocoding.first.geometry["location"]['lng'], geocoding.first.geometry["location"]['lat'])

      yield true, nil, { memory: {
        county: county,
        town: town,
        address: address,
        lat: geocoding.first.geometry["location"]['lat'],
        lng: geocoding.first.geometry["location"]['lng'],
        point_id: point.id
      } }
    end
  rescue
    yield false, { string: '哎呀，你輸入的地點我們無法判斷，請再告訴我一次' }, nil
  end
end
