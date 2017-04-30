class Bot::Nasa::Resolver::UploadPhoto < Bot::Resolver::Base
  def dialog
    { string: '請上傳災情照片' }
  end

  def feed_response(answer)
    success = true
    #

    if success
      yield true, nil, { }
    else
      yield false, { string: '嗯...你上傳的照片有點問題，請再上傳一次' }, nil
    end
  end
end
