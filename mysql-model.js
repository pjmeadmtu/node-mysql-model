var _ = require('underscore')._;
var Backbone = require('backbone');
var mysql = require('mysql');

exports.model = Backbone.Model.extend({
	// Function instead of set, removes functions passed back in results by node-mysql
	setSQL: function(sql) {
		for (var key in sql) {
			if (typeof(sql[key]) != "function") {
				this.set(key, sql[key]);
			}
		};
	},
	// Function for creating custom queries
	query: function(query, callback) {
		this.connection.query(query, function(err, result, fields) {
			if(callback){
				callback(err, result, fields);
			}
		});
	},
	// Function returning one set of results and setting it to model it was used on
	read: function(id, callback) {
		root=this;
		if(this.tableName) var tableName = this.tableName;
		else var tableName = this.attributes.tableName;
		if(!id) {
			id=this.attributes.id;
		} else if (typeof(id) == "function") {
			callback=id;
			id=this.attributes.id;
		}
		var q = "SELECT * FROM "+tableName+" WHERE id="+id;
		this.connection.query(q, root, function(err, result, fields) {
			root.setSQL(result[0]);
			if(callback){
				callback(err, result[0], fields);
			}
		});
	},
	// Function with set of methods to return records from database
	find: function(method, conditions, callback) {
		if (typeof(method) == "function") {
			callback=method;
			method='all';
			conditions={};
		} else if (typeof(conditions) == "function") {
			callback=conditions;
			conditions={};
		}
		if(this.tableName) var tableName = this.tableName;
		else var tableName = this.attributes.tableName;
		// building query conditions
		var qcond='';
		var fields='*';
		if(conditions['fields']) {
			fields=conditions['fields'];
		}
		if(conditions['where']) {
			qcond+=" WHERE "+conditions['where'];
		}
		if(conditions['group']) {
			qcond+=" GROUP BY "+conditions['group'];
			if(conditions['groupDESC']) {
			qcond+=" DESC";
			}
		}
		if(conditions['having']) {
			qcond+=" HAVING "+conditions['having'];
		}
		if(conditions['order']) {
			qcond+=" ORDER BY "+conditions['order'];
			if(conditions['orderDESC']) {
				qcond+=" DESC";
			}
		}
		if(conditions['limit']) {
			qcond+=" LIMIT "+conditions['limit'];
		}

		switch (method) {
			// default method
			case 'all':
				var q = "SELECT "+fields+" FROM "+tableName+qcond;
				this.connection.query(q, function(err, result, fields) {
					if(callback){
						callback(err, result, fields);
					}
				});
				break;
			// method returning value of COUNT(*)
			case 'count':
				var q = "SELECT COUNT(*) FROM "+tableName+qcond;
				this.connection.query(q, function(err, result, fields) {
					if(callback){
						callback(err, result[0]['COUNT(*)'], fields);
					}
				});
				break;
			// method returning only first result (to use when you expect only one result)
			case 'first':
				var q = "SELECT "+fields+" FROM "+tableName+qcond;
				this.connection.query(q, function(err, result, fields) {
					if(callback){
						callback(err, result[0], fields);
					}
				});
				break;
			// method returning only value of one field (if specified in 'fields') form first result
			case 'field':
				var q = "SELECT "+fields+" FROM "+tableName+qcond;
				this.connection.query(q, function(err, result, fields) {
					for (var key in result[0]) break;
					if(callback){
						callback(err, result[0][key], fields);
					}
				});
				break;
		}
	},
	// Function saving your model attributes
	save: function(where, callback) {
		if (typeof(where) == "function") {
			callback=where;
			where=null;
		}
		if(this.tableName) var tableName = this.tableName;
		else var tableName = this.attributes.tableName;
		if(where) {
			var id = null;
			if(this.has('id')) {
				id = this.get('id');
				delete this.attributes.id;
			}
			var q = "UPDATE "+tableName+" SET "+ this.connection.escape(this.attributes)+" WHERE "+where;
			if(id) {
				this.set('id', id);
			}
			var check = "SELECT * FROM "+tableName+" WHERE "+where;
			this.connection.query(check, function(err, result, fields) {
				if(result[0]){
					this.connection.query(q, function(err, result) {
						if(callback){
							callback(err, result, this.connection);
						}
					});
				} else {
					err="ERROR: Record not found";
					callback(err, result, this.connection);
				}
			});

		} else {
			if(this.has('id')) {
				var id = this.get('id');
				delete this.attributes.id;
				var q = "UPDATE "+tableName+" SET "+ this.connection.escape(this.attributes)+" WHERE id="+this.connection.escape(id);
				this.set('id', id);
				var check = "SELECT * FROM "+tableName+" WHERE id="+this.connection.escape(id);
				this.connection.query(check, function(err, result, fields) {
					if(result[0]){
						this.connection.query(q, function(err, result) {
							if(callback){
								callback(err, result, this.connection);
							}
						});
					} else {
						err="ERROR: Record not found";
						callback(err, result, this.connection);
					}
				});
			} else {
				// Create new record
				var q = "INSERT INTO "+tableName+" SET "+ this.connection.escape(this.attributes);
				this.connection.query(q, function(err, result) {
					if(callback){
						callback(err, result, this.connection);
					}
				});
			}
		}
	},
	// Function for removing records
	remove: function(where, callback) {
		if (typeof(where) == "function") {
			callback=where;
			where=null;
		}
		if(this.tableName) var tableName = this.tableName;
		else var tableName = this.attributes.tableName;
		if(where) {
			var q = "DELETE FROM "+tableName+" WHERE "+where;
			var check = "SELECT * FROM "+tableName+" WHERE "+where;
			this.connection.query(check, function(err, result, fields) {
				if(result[0]){
					this.connection.query(q, function(err, result) {
						if(callback){
							callback(err, result, this.connection);
						}
					});
				} else {
					err="ERROR: Record not found";
					callback(err, result, this.connection);
				}
			});
		} else {
			if(this.has('id')) {
				var q = "DELETE FROM "+tableName+" WHERE id="+this.connection.escape(this.attributes.id);
				var check = "SELECT * FROM "+tableName+" WHERE id="+this.connection.escape(this.attributes.id);
				this.clear();
				this.connection.query(check, function(err, result, fields) {
					if(result[0]){
						this.connection.query(q, function(err, result) {
							if(callback){
								callback(err, result, this.connection);
							}
						});
					} else {
						err="ERROR: Record not found";
						callback(err, result, this.connection);
					}
				});
			} else {
				err="ERROR: Model has no specified ID, delete aborted";
				if(callback){
					callback(err, result, this.connection);
				}
			}
		}
	}
});
