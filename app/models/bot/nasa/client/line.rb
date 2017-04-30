class Bot::Nasa::Client::Line < ActiveRecord::Base
  has_one :waiter, class_name: 'Bot::Nasa::Waiter', as: :client

  has_many :messages,     class_name: 'Bot::Message', as: :client

  def self.fetch(utype, uid)
    user = self.find_by_utype_and_uid(utype, uid)
    if user.nil?
      user = self.new(utype: utype, uid: uid)
      user.save
      user.reload
    end

    user
  end

  after_create :create_waiter!

  def create_waiter!
    waiter = Bot::Waiter.new
    waiter.client = self
    waiter.save
    waiter.meet!
  end
end
