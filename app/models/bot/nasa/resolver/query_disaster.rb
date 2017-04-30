class Bot::Nasa::Resolver::QueryDisaster < Bot::Resolver::Base
  def resolver_type
    ResolverType.enum(:show_information)
  end

  def dialog_type
    DialogType.enum(:slides)
  end

  def dialog
    slides = []
    Disaster
      .where('geom is not null')
      .where("is_debris = ? OR is_erosion = ? OR is_landslide = ? OR is_flood = ?", true, true, true, false)
      .order("ST_Distance(geom, 'SRID=4326; POINT(#{@memory[:lng]} #{@memory[:lat]}) ASC')")
      .limit(5).map { |record|
        disaster = Disaster.find_by_file_url record.file_url
        slides.push({
            thumbnailImageUrl: disaster.photo.url,
            title: disaster.name + (disaster.is_erosion ? ' 土石流' : '') + (disaster.is_landslide ? ' 坍方' : '')  + (disaster.is_debris ? ' 倒塌' : ''),
            text: "#{disaster.county}#{disaster.town}#{disaster.village}\n#{disaster.occured_at.strftime('%Y/%m/%d')}" + (disaster.rain ? "\n雨量：#{disaster.rain}mm" : ''),
            actions: [
              {
                type: 'uri',
                label: '查看災害報告',
                uri: URI.escape(disaster.file_url)
              },
              {
                type: 'uri',
                label: '查看地圖位置',
                uri: URI.escape("https://www.google.com/maps/search/#{disaster.geom.y},#{disaster.geom.x}")
              }
            ]
          })
      }

    return {
      slides: slides
    }
  end
end
