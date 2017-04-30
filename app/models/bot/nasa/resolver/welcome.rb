class Bot::Nasa::Resolver::Welcome < Bot::Resolver::Base
  ServiceList = [
    '查詢附近歷史災害',
    '回報災害狀況',
    '告訴我避難地點',
    {
      type: 'uri',
      label: '前往平台網站',
      uri: 'http://nasa.houseplus.asia'
    }
  ]



  ServiceListMap = {
    '查詢附近歷史災害' => :query_disaster,
    '回報災害狀況' => :upload,
    '告訴我避難地點' => :escape,
  }

  def dialog_type
    DialogType.enum(:string_n_list)
  end

  def dialog
    { string: '請問您需要下列哪一項服務呢?', list: ServiceList }
  end

  def feed_response(answer)
    if !ServiceList.include?(answer)
      yield false, { string: '請點選列表回答，請問您需要什麼服務？', list: ServiceList }, nil
    else
      yield true, nil, { topic: ServiceListMap[answer] }
    end
  end
end
