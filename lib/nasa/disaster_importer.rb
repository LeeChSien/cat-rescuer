class DisasterImporter
  def self.import
    raw_content = File.read('lib/doc/nasa/disaster.json')
    json = JSON.parse(raw_content)

    Disaster.delete_all

    json.each do |d|
      params = {
        county:   d['County'],
        town:     d['Town'],
        village:  d['Vill'],
        name:     d['DisasterName'],
        file_url: d['FileUrl'],

        is_debris:    d['IsDebris'],
        is_flood:     d['IsFlood'],
        is_erosion:   d['IsErosion'],
        is_landslide: d['IsLandslide'],

        occured_at: Time.parse(d['DisasterTime'])
      }

      disaster = Disaster.new params
      disaster.save
    end
  end

  def self.import_nasa
    CSV.open('lib/doc/nasa/Global_Landslide_Catalog_Export.csv', 'r') do |csv|
      keys = []
      csv.first.each { |header| keys.push(header) }

      points = csv.map do |a|
        point = Hash[keys.zip(a)]
        if point['country'] and point['country'].downcase == 'taiwan'
          occured_datetime = Date.strptime(point['date'], "%m/%d/%Y").to_time
          disasters = Disaster.where("occured_at > ? and occured_at < ? and
            ST_DWithin(Geography(geom), Geography('SRID=4326; POINT(#{point['longitude']} #{point['latitude']})'), 50000)",
            occured_datetime-24.hours, occured_datetime+24.hours)
          if disasters.length != 0
            params = {
              file_url: point['source_link'],

              is_debris:    false,
              is_flood:     false,
              is_erosion:   false,
              is_landslide: false,

              occured_at: occured_datetime
            }
            if point['trigger']
              params['name'] = point['trigger']
              if point['storm_name']
                params['name'] = params['name']+' '+point['storm_name']
              end
            end

            disaster = Disaster.new params
            disaster.geom = gis_sql_factory_proxy("SELECT ST_GeomFromText('POINT(#{point['longitude']} #{point['latitude']})', 4326)")
            disaster.save
          end
        end
      end

    end
    nil
  end

  def self.set_filename
    Disaster.all.each do |disaster|
      filename = disaster.file_url.split("\/").last

      disaster.file_name = filename
      disaster.save
    end
  end

  def self.download
    Disaster.all.each do |disaster|
      filename = disaster.file_url.split("\/").last

      File.open("public/static-file/disaster/#{filename}", "wb") do |saved_file|
        puts disaster.file_url

        begin
          open(URI.escape(disaster.file_url), "rb") do |read_file|
            saved_file.write(read_file.read)
          end
        rescue
          puts 'error'
        end
      end
    end
  end

  def self.fetch_pdf
    Disaster.all.each do |disaster|
      data = File.read("public/static-file/disaster/#{disaster.file_name}")
      text = Yomu.read :text, data

      begin
        x = nil
        x = text.match(/X:\d+/)[0] if text.match(/X:\d+/)
        x = text.match(/X: \d+/)[0] if text.match(/X: \d+/)
        x = text.match(/X：\d+/)[0] if text.match(/X：\d+/)
        x = text.match(/X \d+/)[0] if text.match(/X \d+/)
        x = x.match(/\d+/)[0].to_i

        y = nil
        y = text.match(/Y:\d+/)[0] if text.match(/Y:\d+/)
        y = text.match(/Y: \d+/)[0] if text.match(/Y: \d+/)
        y = text.match(/Y：\d+/)[0] if text.match(/Y：\d+/)
        y = text.match(/Y \d+/)[0] if text.match(/Y \d+/)
        y = y.match(/\d+/)[0].to_i

        twd67 = text.include?('TWD67')

        if x && y && x > 100000 && y > 1000000
          if twd67
            disaster.geom = twd67_to_wgs84(x, y)
          else
            disaster.geom = twd97_to_wgs84(x, y)
          end
          disaster.save
        end

        rain = nil
        rain = text.match(/雨量:\d+.\d+/)[0] if text.match(/雨量:\d+.\d+/)
        rain = text.match(/雨量: \d+.\d+/)[0] if text.match(/雨量: \d+.\d+/)
        rain = text.match(/雨量：\d+.\d+/)[0] if text.match(/雨量：\d+.\d+/)

        if rain
          rain = rain.match(/\d+.\d+/)[0].to_f

          disaster.rain = rain
          disaster.save
        end

        puts "(#{x}, #{y}), twd67: #{twd67}, rain: #{rain}"
      rescue
        puts text
      end

      puts '-----'
    end
  end

  def self.twd67_to_wgs84(lon, lat)
    raw_geom = gis_sql_factory_proxy(
      "SELECT ST_Transform(ST_GeomFromText('POINT(#{lon} #{lat})', 3828), 4326)")
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
