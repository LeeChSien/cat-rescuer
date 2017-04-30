class EscapePoint < ActiveRecord::Base
  # class method
  def self.find_nearest(lng, lat)
    self.order("ST_Distance(geom, 'SRID=4326; POINT(#{lng} #{lat}) ASC')").first
  end

end
