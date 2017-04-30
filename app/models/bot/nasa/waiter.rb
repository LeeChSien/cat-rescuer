class Bot::Nasa::Waiter < ActiveRecord::Base
  belongs_to :client, :polymorphic => true

  class MemoryManager
    def initialize(waiter)
      @waiter = waiter
      @waiter.update_attributes(memory: {}) if @waiter.memory.nil?
    end

    def set(new_memory)
      _memory = @waiter.memory.symbolize_keys.merge(new_memory.symbolize_keys)
      @waiter.update_attributes(memory: _memory)
    end

    def get
      @waiter.memory.symbolize_keys
    end

    def reset!
      @waiter.update_attributes(memory: {})
    end
  end

  def set_memory!(new_memory)
    mm = MemoryManager.new(self)
    mm.set(new_memory)
  end

  class StateMachine
    Topics = [:welcome, :query_disaster, :upload, :escape]
    TopicResolverChain = {
      welcome: [
        :welcome
      ],
      upload: [
        :address_with_location, :upload_photo, :thanks
      ],
      query_disaster: [
        :address_with_location, :query_disaster
      ],
      escape: [
        :address_with_location, :show_escape_image, :show_escape_text
      ],
    }

    def initialize(waiter)
      @waiter = waiter
    end

    def set_topic!(topic)
      @waiter.state_topic = topic
      @waiter.save

      set_resolver!(nil)
    end

    def set_resolver!(resolver)
      @waiter.state_resolver = resolver
      @waiter.save
    end

    def topic
      @waiter.state_topic ? @waiter.state_topic.to_sym : nil
    end

    def resolver
      @waiter.state_resolver ? @waiter.state_resolver.to_sym : nil
    end

    def set_silent!(s)
      @waiter.silent = s
      @waiter.save
    end

    def silent?
      @waiter.silent
    end

    def resolver_class
      "Bot::Nasa::Resolver::#{@waiter.state_resolver.camelize}".constantize
    end

    def next_resolver!
      if resolver.nil?
        set_resolver!(TopicResolverChain[topic].first)
      else
        chain = TopicResolverChain[topic]

        Rails.logger.debug topic
        Rails.logger.debug chain

        current_index = chain.index(resolver)

        if current_index + 1 < chain.size
          set_resolver!(chain[current_index + 1])
        else
          set_resolver!(nil)
        end
      end
    end

    def reset!
      set_topic!('welcome')
    end
  end


  def meet!
    sm = StateMachine.new(self)
    sm.reset!

    mm = MemoryManager.new(self)
    mm.reset!
  end

  def is_interupt(sentence)
    sentence.include?('取消') || sentence.include?('不問了') || sentence.include?('重來')
  end

  def is_close(sentence)
    sentence.include?('閉嘴')
  end

  def is_open(sentence)
    sentence.include?('貓')
  end

  def listen(sentence='', &block)
    sm = StateMachine.new(self)
    mm = MemoryManager.new(self)

    if is_close(sentence) && !sm.silent?
      sm.set_silent!(true)

      response = {
        resolver_type: 'close',
        dialog_type: Bot::Resolver::Base::DialogType.enum(:string),
        dialog: {string: '好的，下次需要我，叫我一聲'},
      }
      block.call(response) if block_given?
      return response
    end

    if is_open(sentence)
      sm.set_silent!(false)
      meet!
    end
    return if sm.silent?



    # user interupt topic chain
    if is_interupt(sentence)
      meet!

      response = {
        resolver_type: 'interupt',
        dialog_type: Bot::Resolver::Base::DialogType.enum(:string),
        dialog: {string: '好的，期待您下次再來'},
      }
      block.call(response) if block_given?
      return response
    end

    if !sm.resolver.nil?
      last_resolver = sm.resolver_class.new(self, mm.get)

      # solve last resolver for ask_question
      if last_resolver.resolver_type == Bot::Resolver::Base::ResolverType.enum(:ask_question)
        last_resolver.feed_response(sentence) do |success, dialog, result|
          # wrong answer
          if !success
            response = {
              resolver_type: last_resolver.resolver_type,
              dialog_type: last_resolver.dialog_type,
              dialog: dialog,
            }
            block.call(response) if block_given?
            return response
          end

          # do something by result
          mm.set(result[:memory]) if result[:memory]
          sm.set_topic!(result[:topic]) if result[:topic]
        end
      end
    end

    while(true) do
      # move to next resolver
      sm.next_resolver!

      if sm.resolver.nil?
        # touch topic chain ending & move to initial topic
        meet!

        if block_given?
          listen(sentence, &block)
          return
        else
          return listen(sentence)
        end
      else
        current_resolver = sm.resolver_class.new(self, mm.get)
        if !current_resolver.skip?
          response = {
            resolver_type: current_resolver.resolver_type,
            dialog_type: current_resolver.dialog_type,
            dialog: current_resolver.dialog,
          }

          if block_given?
            block.call(response)
            listen(sentence, &block) if current_resolver.transitive?
            return
          else
            if current_resolver.transitive?
              return [
                response, listen(sentence)
              ].flatten
            else
              return response
            end
          end
        end
      end
    end

  end
end
