class EscapePointImporter
  def self.import
    raw_content = File.read('lib/doc/nasa/escape_point.json')
    json = JSON.parse(raw_content)

    EscapePoint.delete_all

    json['features'].each do |feature|
      params = {
        county: feature['properties']['COUNTY'],
        town: feature['properties']['TOWN'],
        village: feature['properties']['VILL'],
        name: feature['properties']['ERNAME'],
        address: feature['properties']['ADDR'],
      }

      point = EscapePoint.new params
      point.save

      point.geom = twd97_to_wgs84(feature['geometry']['coordinates'].first, feature['geometry']['coordinates'].last)
      point.save
    end
  end

  def self.twd97_to_wgs84(lon, lat)
    raw_geom = gis_sql_factory_proxy(
      "SELECT ST_Transform(ST_GeomFromText('POINT(#{lon} #{lat})', 3826), 4326)")
  end

  def self.gis_sql_factory_proxy(sql)
    result = ActiveRecord::Base.connection.execute(sql).values
    (result.first and result.first.first) ? result.first.first : nil
  end
end
