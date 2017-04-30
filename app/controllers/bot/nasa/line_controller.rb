require 'line/bot'

class Bot::Nasa::LineController < ApplicationController
  skip_before_filter :verify_authenticity_token

  def production
    @channel_secret = '23c7ec20bfc458a554e882db3215c44b'
    @channel_token  = 'DvDWXEUwJADFKrElraAm9xGKTEd9RjFWc5D1oF/bYG5+ELFO7a5WMpObho3m/zOndkSlH3z5FmGDQMtx60+TEXdqn1xCIZzyr+aHYNhfS0T2UGRF7ddOc5zVsXpc56TSPOekRuSikczJgr1MOLvIRwdB04t89/1O/w1cDnyilFU='

    main

    render text: 'OK'
  end

  def main
    body = request.raw_post

    signature = request.env['HTTP_X_LINE_SIGNATURE']
    unless client.validate_signature(body, signature)
      render status: 400, text: '/400'
      return
    end

    events = client.parse_events_from(body)
    events.each { |event|
      case event
      when Line::Bot::Event::Message
        case event.type
        when Line::Bot::Event::MessageType::Text, Line::Bot::Event::MessageType::Location, Line::Bot::Event::MessageType::Image

          message = '' if event.type == Line::Bot::Event::MessageType::Image
          message = event.message['text']    if event.type == Line::Bot::Event::MessageType::Text
          message = event.message['address'] if event.type == Line::Bot::Event::MessageType::Location

          uid = event['source']['roomId'] if event['source']['type'] == 'room'
          uid = event['source']['userId'] if event['source']['type'] == 'user'
          user_client = Bot::Nasa::Client::Line.fetch(event['source']['type'], uid)

          # save message
          user_client.messages.create({
              content_type: event.message['type'],
              content_id:   event.message['id'],
              content:      message
            })

          waiter = user_client.waiter

          dialog = waiter.listen(message)
          dialogs = dialog.kind_of?(Array) ? dialog : [dialog]

          messages = dialogs.map { |dialog|
            if dialog
              case dialog[:dialog_type]
              when 'string'
                wrap_msg_object(dialog[:dialog])
              when 'string_n_list'
                wrap_list_object(dialog[:dialog])
              when 'string_n_photo'
                wrap_list_object(dialog[:dialog])
              when 'photo'
                wrap_photo_object(dialog[:dialog])
              when 'slides'
                wrap_slides_object(dialog[:dialog])
              end
            else
              nil
            end
          }.compact

          res = client.reply_message(event['replyToken'], messages)
          Rails.logger.debug res.body
        when Line::Bot::Event::MessageType::Video
          # response = client.get_message_content(event.message['id'])
          # tf = Tempfile.open("content")
          # tf.write(response.body)
        end
      end
    }
  end

  private

    def client
      @client ||= Line::Bot::Client.new { |config|
        config.channel_secret = @channel_secret
        config.channel_token  = @channel_token
      }
    end

    def wrap_msg_object(dialog)
      {
        type: 'text',
        text: dialog[:string]
      }
    end

    def wrap_slides_object(dialog)
      Rails.logger.debug({
        type: 'carousel',
        columns: dialog[:slides]
      })

      {
        type: "template",
        altText: '哎呀，你的版本過舊，請升級 LINE',
        template: {
          type: 'carousel',
          columns: dialog[:slides]
        }
      }
    end

    def wrap_list_object(dialog)
      altText = "#{dialog[:string]}:\n"
      list = []

      if dialog[:list]
        dialog[:list].each do |item|
          if item.is_a? String
            if list.size < 4
              list.push({
                type: "message", label: item, data: item, text: item
              })
              altText += "#{item}:\n"
            end
          else
            if list.size < 4
              list.push(item)
            end
          end
        end
      end

      {
        type: "template",
        altText: altText,
        template: {
          thumbnailImageUrl: dialog[:photo],
          type: (list == 2 && !dialog[:photo]) ? "confirm" : "buttons",
          text: dialog[:string],
          actions: list
        }
      }
    end

    def wrap_photo_object(dialog)

      {
        type: "image",
        originalContentUrl: dialog[:photo],
        previewImageUrl: dialog[:thumb]
      }
    end
end
