class Bot::Nasa::Resolver::ShowEscapeText < Bot::Resolver::Base
  def resolver_type
    ResolverType.enum(:show_information)
  end

  def dialog_type
    DialogType.enum(:string_n_list)
  end

  def dialog
    point = EscapePoint.find(@memory[:point_id])

    uri = URI.escape("https://www.google.com/maps/dir/#{@memory[:lat]},#{@memory[:lng]}/#{point.geom.y},#{point.geom.x}")

    return {
      string: "避難地點：#{point.name}\n地址：#{point.address}",
      list: [
        {
          type: 'uri',
          label: '開啟導航',
          uri: uri
        }
      ]
    }
  end
end
