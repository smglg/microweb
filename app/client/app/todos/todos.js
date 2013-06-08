/**
 * todo 客户端
 * @author gaoshiming@live.com
 * @github github.com/smglg/microweb
 * @date Thu Jun 6 2013
 */
jQuery(function($){
  var Task = Backbone.Model.extend({
    idAttribute: '_id',
    urlRoot: '/todos/api',
    defaults: {
      processed: 0
    },
    parse: function(data){
      'status' in data || (data.status = null);
      if (data.status === 0){
        this.trigger('error');
        return null;
      } else if (data.status === 1) {
        this.trigger('done');
        return data.todo;
      }
      return data;
    }
  }),
      TaskView = Backbone.View.extend({
        tagName:'div',
        template: function anonymous(locals) {
          var buf = [];
          var locals_ = (locals || {}),title = locals_.title,detail = locals_.detail,processed = locals_.processed;buf.push("<h2>" + (title ? title : "") + "</h2><p>" + (detail ? detail : "") + "<div class=\"progress\"><div style=\"width:"+(processed ? processed : 0)+"%\" class=\"bar\" ></div></div></p><p><a class=\"btn edit\"><i class=\"icon-cog\"></i></a><a class=\"btn do\"><i class=\"icon-arrow-up\"></i></a><a class=\"btn drop pull-right\"><i class=\"icon-remove\"></i></a></p>");;return buf.join("");
        },
        templateBig: function(locals){
          var buf = [];
          var locals_ = (locals || {}),
              title = locals_.title ? locals_.title : '',
              detail = locals_.detail ? locals_.detail : '',
              processed = locals_.processed ? locals_.processed : 0;
          buf.push('<h1>正在做：<span class="lead">'+ title + '</span></h1>');
          buf.push('<p>'+detail+'</p>');
          buf.push('<div>当前进度：'+processed+'%');
          buf.push('<div class="progress progress-striped active">');
          buf.push('<div style="width:'+processed+'%" class="bar"></div>');
          buf.push('</div>');
          buf.push('</div>');
          buf.push('<div class="control-group">');
          buf.push('<div class="span2"><button class="btn done'+ ((processed < 100) ? ' disabled' : '') +'"><i class="icon-ok"></i>标记完成</button></div>');
          buf.push('<div class="span1"><button class="btn plus'+ ((processed == 100) ? ' disabled' : '') +'"><i class="icon-plus"></i></button></div>');
          buf.push('<div class="span1"><button class="btn minus'+ ((processed == 0) ? ' disabled' : '') +'"><i class="icon-minus"></i></button></div>');
          buf.push('<div class="span2"><button class="btn edit"><i class="icon-cog"></i>调整内容</button></div>');
          buf.push('<div class="span1 pull-right"><button class="btn pending"><i class="icon-arrow-down"></i></button></div>');
          buf.push('</div>');
          return buf.join('');
        },
        render: function(){
          switch(this.model.get('state')){
            case 'pending':
            this.$el.attr('class','span4 thumbnail');
            this.$el.html(this.template(this.model.attributes));
            break;
            case 'doing':
            this.$el.attr('class','hero-unit');
            this.$el.html(this.templateBig(this.model.attributes));
            break;
          }
          return this;
        },
        initialize: function(opt){
          this.model = opt.model;
          this.listenTo(this.model,'change',this.render);
          this.listenTo(this.model, 'destroy', this.remove);
        },
        events: {
          'click .edit': 'edit',
          'click .do': 'do',
          'click .drop': 'drop',
          'click .plus:not(.disabled)': 'plus',
          'click .minus:not(.disabled)': 'minus',
          'click .done:not(.disabled)': 'done'
        },
        drop: function(){
          console.log(this.model);
          console.log(this.model.isNew());
          this.model.destroy({wait: true});
        },
        do: function(){
          this.model.save({state:'doing'}, {wait:true});
        },
        plus: function(){
          var processed = this.model.get('processed') + 5;
           processed = processed < 100 ? processed : 100;
          this.model.save({processed: processed}, {wait:true});
        },
        minus: function(){
          var processed = this.model.get('processed') - 5;
           processed = processed > 0 ? processed : 0;
          this.model.save({processed: processed}, {wait:true});
        },
        edit: function(){
          taskSetting.setModel(this.model);
        },
        done: function(){
          if(this.model.get('processed') == 100){
            this.model.save({state:'done'},{wait:true});
          }
        }
      }),
      DashboardView = Backbone.View.extend({
        el: $('#dashboard')[0],
        events:{
          'click #tasks': 'tasks',
          'click #done': 'done',
          'click #add': 'add',
          'click #trash': 'trash'
        },
        initialize: function(attr){
          this.taskView = attr.taskView;
        },
        add: function(){
          this.taskView.model.clear();
          this.taskView.$el.modal();
        }
      }),
      TaskSettingView = Backbone.View.extend({
        el: $('#taskModal')[0],
        initialize: function(attr){
          this.model = new Task;
          this.collection = attr.collection;
          this.listenTo(this.model, 'change', this.render);
          this.listenTo(this.model, 'done', this.done);
        },
        done: function(){
          this.collection.fetch();
          this.$el.modal('hide');
        },
        setModel: function(model){
          this.model.clear();
          this.model.set(model.attributes);
          this.$el.modal('show');
        },
        render: function(){
          var attr = this.model.attributes;
          this.$el.find('[name="title"]').val(attr.title);
          this.$el.find('[name="detail"]').val(attr.detail);
        },
        serialize: function(){
          var attrs = {};
          var arr = this.$el.find('form').serializeArray();
          _.each(arr, function(obj){
            attrs[obj.name] = obj.value;
          });
          return attrs;
        },
        events: {
          'click .btn-primary': 'doSync'
        },
        doSync: function(){
          this.model.save(this.serialize(), {wait:true});
        }
      }),
      Tasks = Backbone.Collection.extend({
        model: Task,
        url: '/todos/api',
        parse: function(data){
          if(data.status===1){
            return data.todo;
          } else {
            this.error(data.message.type);
            return null;
          }
        },
        error: function(data){
          console.log(data);
        }
      }),
      TodoApp = Backbone.View.extend({
        initialize: function(opt){
          this.collection = opt.collection;
          this.views = [];
          this.listenTo(this.collection,'add', this.addOne);
          this.listenTo(this.collection, 'remove', this.removeOne);
          this.render();
        },
        el: $('#todo-list')[0],
        addOne: function(model){
          if (model.get('state') === 'pending') {
            
          }
          var el = (new TaskView({model:model})).render().el;
          this.$el.append(el);
        },
        addAll: function(){
          var self = this;
          this.collection.each(function(model){
            self.addOne(model);
          });
        },
        render: function(){
          this.$el.empty();
          this.addAll();
        }
      });
  window.todos = new Tasks;
  window.app = new TodoApp({collection: todos});

  todos.fetch();
  window.taskSetting = new TaskSettingView({collection: todos});
  window.dashboard = new DashboardView({taskView: taskSetting, app: app});
});


