class Bot::Nasa::Resolver::Thanks < Bot::Resolver::Base
  def resolver_type
    ResolverType.enum(:show_information)
  end

  def dialog_type
    DialogType.enum(:string)
  end

  def dialog
    return {
      string: "感謝你的協助!"
    }
  end
end
