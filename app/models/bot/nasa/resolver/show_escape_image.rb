class Bot::Nasa::Resolver::ShowEscapeImage < Bot::Resolver::Base
  def resolver_type
    ResolverType.enum(:show_information)
  end

  def transitive?
    true
  end

  def dialog_type
    DialogType.enum(:photo)
  end

  def dialog
    point = EscapePoint.find(@memory[:point_id])

    thumb = Bot::Image.new
    thumb.client = @waiter.client
    thumb.save
    width = 240
    height = 240
    url = "http://#{Settings.host}/screenshot/escape_point?id=#{point.id}&width=#{width}&height=#{height}"
    thumb_url = thumb.generate_image!(url, width, height)

    photo = Bot::Image.new
    photo.client = @waiter.client
    photo.save
    width = 1024
    height = 768
    url = "http://#{Settings.host}/screenshot/escape_point?id=#{point.id}&width=#{width}&height=#{height}"
    photo_url = photo.generate_image!(url, width, height)

    return {
      photo: photo_url,
      thumb: thumb_url
    }
  end
end
