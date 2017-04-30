class Disaster < ActiveRecord::Base
  mount_uploader :photo, FileUploader
  mount_uploader :thumb, FileUploader

  def self.dedupe
    # find all models and group them on keys which should be common
    grouped = all.group_by{|model| [model.file_url] }
    grouped.values.each do |duplicates|
      # the first one we want to keep right?
      first_one = duplicates.shift # or pop for last one
      # if there are any more left, they are duplicates
      # so delete all of them
      duplicates.each{|double| double.destroy} # duplicates can now be destroyed
    end
  end

  def generate_tmp_image(url, width, height)
    ws = Webshot::Screenshot.instance
    ws.send(:page).driver.add_headers('Accept-Language' => 'zh-TW')

    image = ws.capture url, "tmp.png", width: 1024, height: 768
    image.crop "#{width}x#{height}+0+0"

    path = "tmp/#{SecureRandom.hex}.png"
    full_path = "#{Rails.root}/#{path}"
    image.write(full_path)

    path
  end

  def generate_image!
    width = 240
    height = 240
    url = "http://#{Settings.host}/screenshot/escape_point?id=#{id}&width=#{width}&height=#{height}"
    self.thumb = Rails.root.join(generate_tmp_image(url, width, height)).open
    self.save

    width = 1024
    height = 768
    url = "http://#{Settings.host}/screenshot/escape_point?id=#{id}&width=#{width}&height=#{height}"
    self.photo = Rails.root.join(generate_tmp_image(url, width, height)).open
    self.save
  end
end
