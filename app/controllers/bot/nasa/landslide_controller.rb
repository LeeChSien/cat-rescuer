class Bot::Nasa::LandslideController < ApplicationController
  layout 'bot/nasa/index'

  def index
    
  end

  def landslide
    @disasters = Disaster
      .where('geom is not null')
      .where("is_debris = ? OR is_erosion = ? OR is_landslide = ? OR is_flood = ?", true, true, true, false)
      .select('distinct file_url').map { |record|
        disaster = Disaster.find_by_file_url record.file_url

        disaster.attributes.merge({
            lng: disaster.geom.try(:x),
            lat: disaster.geom.try(:y)
          })
      }

    set_ng_app('nasaLandslideApp')
    render 'landslide'
  end
end
