"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var WebDAVRequest_1 = require("../WebDAVRequest");
var XML_1 = require("../../../helper/XML");
var Workflow_1 = require("../../../helper/Workflow");
var Errors_1 = require("../../../Errors");
var http = require("http");
function dateISO8601(ticks) {
    // Adding date
    var date = new Date(ticks);
    var result = date.toISOString().substring(0, '0000-00-00T00:00:00'.length);
    // Adding timezone offset
    var offset = date.getTimezoneOffset();
    result += offset < 0 ? '-' : '+';
    offset = Math.abs(offset);
    var h = Math.ceil(offset / 60).toString(10);
    while (h.length < 2)
        h = '0' + h;
    var m = (offset % 60).toString(10);
    while (m.length < 2)
        m = '0' + m;
    result += h + ':' + m;
    return result;
}
function parseRequestBody(ctx, data) {
    var allTrue = {
        leftElements: [],
        mustDisplay: function () { return true; },
        mustDisplayValue: function () { return true; }
    };
    var onlyName = {
        leftElements: [],
        mustDisplay: function () { return true; },
        mustDisplayValue: function () { return false; }
    };
    if (ctx.headers.contentLength <= 0)
        return allTrue;
    try {
        var xml = XML_1.XML.parse(data);
        var propfind = xml.find('DAV:propfind');
        if (propfind.findIndex('DAV:propname') !== -1)
            return onlyName;
        if (propfind.findIndex('DAV:allprop') !== -1)
            return allTrue;
        var prop_1 = propfind.find('DAV:prop');
        var fn = function (name) {
            var index = prop_1.findIndex(name);
            if (index === -1)
                return false;
            prop_1.elements.splice(index, 1);
            return true;
        };
        return {
            leftElements: prop_1.elements,
            mustDisplay: fn,
            mustDisplayValue: function () { return true; }
        };
    }
    catch (ex) {
        return allTrue;
    }
}
function propstatStatus(status) {
    return 'HTTP/1.1 ' + status + ' ' + http.STATUS_CODES[status];
}
var default_1 = (function () {
    function default_1() {
    }
    default_1.prototype.unchunked = function (ctx, data, callback) {
        ctx.getResource(function (e, resource) {
            var lockDiscoveryCache = {};
            ctx.checkIfHeader(resource, function () {
                var targetSource = ctx.headers.isSource;
                var multistatus = XML_1.XML.createElement('D:multistatus', {
                    'xmlns:D': 'DAV:'
                });
                resource.type(function (e, type) { return process.nextTick(function () {
                    if (e) {
                        ctx.setCode(e === Errors_1.Errors.ResourceNotFound ? WebDAVRequest_1.HTTPCodes.NotFound : WebDAVRequest_1.HTTPCodes.InternalServerError);
                        return callback();
                    }
                    if (!type.isDirectory || ctx.headers.depth === 0) {
                        addXMLInfo(resource, multistatus, function (e) {
                            if (!e)
                                done(multistatus);
                            else {
                                if (!ctx.setCodeFromError(e))
                                    ctx.setCode(WebDAVRequest_1.HTTPCodes.InternalServerError);
                                callback();
                            }
                        });
                        return;
                    }
                    //ctx.requirePrivilege('canGetChildren', resource, () => {
                    resource.readDir(true, function (e, children) { return process.nextTick(function () {
                        function err(e) {
                            if (!ctx.setCodeFromError(e))
                                ctx.setCode(WebDAVRequest_1.HTTPCodes.InternalServerError);
                            callback();
                        }
                        addXMLInfo(resource, multistatus, function (e) {
                            if (e)
                                return err(e);
                            new Workflow_1.Workflow()
                                .each(children, function (childName, cb) {
                                ctx.server.getResource(ctx, ctx.requested.path.getChildPath(childName), function (e, r) {
                                    if (e)
                                        return cb(e);
                                    addXMLInfo(r, multistatus, cb);
                                });
                            })
                                .error(err)
                                .done(function () {
                                done(multistatus);
                            });
                        });
                    }); });
                    //})
                }); });
                function addXMLInfo(resource, multistatus, _callback) {
                    var reqBody = parseRequestBody(ctx, data);
                    var response = XML_1.XML.createElement('D:response');
                    var callback = function (e) {
                        if (e === Errors_1.Errors.MustIgnore)
                            e = null;
                        else if (!e)
                            multistatus.add(response);
                        _callback(e);
                    };
                    var propstat = response.ele('D:propstat');
                    /*const privileges : BasicPrivilege[] = [
                        'canGetCreationDate', 'canGetAvailableLocks', 'canGetLastModifiedDate', 'canGetMimeType', 'canGetProperties', 'canGetSize', 'canGetType', 'canGetWebName'
                    ];
                    if(targetSource)
                        privileges.push('canSource');
                    ctx.requireErPrivilege(privileges, resource, (e, can) => {
                        if(e)
                        {
                            callback(e);
                            return;
                        }
                        
                        if(!can)
                        {
                            callback(Errors.BadAuthentication);
                            return;
                        }*/
                    propstat.ele('D:status').add('HTTP/1.1 200 OK');
                    var prop = propstat.ele('D:prop');
                    var nb = 1;
                    function nbOut(error) {
                        if (nb > 0 && error) {
                            nb = -1000;
                            return callback(error);
                        }
                        --nb;
                        if (nb === 0) {
                            if (reqBody.leftElements.length > 0) {
                                var propstatError = response.ele('D:propstat');
                                var prop_2 = propstatError.ele('D:prop');
                                propstatError.ele('D:status').add(propstatStatus(WebDAVRequest_1.HTTPCodes.NotFound));
                                for (var i = 0; i < reqBody.leftElements.length; ++i)
                                    if (reqBody.leftElements[i])
                                        prop_2.ele(reqBody.leftElements[i].name);
                            }
                            callback();
                        }
                    }
                    var tags = {};
                    function mustDisplayTag(name) {
                        if (reqBody.mustDisplay('DAV:' + name))
                            tags[name] = {
                                el: prop.ele('D:' + name),
                                value: reqBody.mustDisplayValue('DAV:' + name)
                            };
                        else
                            tags[name] = {
                                value: false
                            };
                    }
                    mustDisplayTag('getlastmodified');
                    mustDisplayTag('lockdiscovery');
                    mustDisplayTag('supportedlock');
                    mustDisplayTag('creationdate');
                    mustDisplayTag('resourcetype');
                    mustDisplayTag('displayname');
                    mustDisplayTag('getetag');
                    function displayValue(values, fn) {
                        if (values.constructor === String ? tags[values].value : values.some(function (n) { return tags[n].value; })) {
                            ++nb;
                            process.nextTick(fn);
                        }
                    }
                    displayValue('creationdate', function () {
                        resource.creationDate(function (e, ticks) { return process.nextTick(function () {
                            if (!e)
                                tags.creationdate.el.add(dateISO8601(ticks));
                            nbOut(e);
                        }); });
                    });
                    displayValue('lockdiscovery', function () {
                        resource.listDeepLocks(function (e, locks) {
                            if (e)
                                return nbOut(e);
                            for (var path in locks) {
                                for (var _i = 0, _a = locks[path]; _i < _a.length; _i++) {
                                    var _lock = _a[_i];
                                    var lock = _lock;
                                    var activelock = tags.lockdiscovery.el.ele('D:activelock');
                                    activelock.ele('D:lockscope').ele('D:' + lock.lockKind.scope.value.toLowerCase());
                                    activelock.ele('D:locktype').ele('D:' + lock.lockKind.type.value.toLowerCase());
                                    activelock.ele('D:depth').add('Infinity');
                                    if (lock.owner)
                                        activelock.ele('D:owner').add(lock.owner);
                                    activelock.ele('D:timeout').add('Second-' + (lock.expirationDate - Date.now()));
                                    activelock.ele('D:locktoken').ele('D:href', undefined, true).add(lock.uuid);
                                    activelock.ele('D:lockroot').ele('D:href', undefined, true).add(ctx.fullUri(path).replace(' ', '%20'));
                                }
                            }
                            nbOut(null);
                        });
                    });
                    ++nb;
                    resource.type(function (e, type) { return process.nextTick(function () {
                        if (e)
                            return nbOut(e);
                        resource.fs.getFullPath(ctx, resource.path, function (e, path) {
                            if (e)
                                return nbOut(e);
                            var p = ctx.fullUri(path.toString()).replace(' ', '%20');
                            var href = p.lastIndexOf('/') !== p.length - 1 && type.isDirectory ? p + '/' : p;
                            response.ele('D:href', undefined, true).add(href);
                            response.ele('D:location').ele('D:href', undefined, true).add(p);
                            if (tags.resourcetype.value && type.isDirectory)
                                tags.resourcetype.el.ele('D:collection');
                            if (type.isFile) {
                                mustDisplayTag('getcontentlength');
                                mustDisplayTag('getcontenttype');
                                if (tags.getcontenttype.value) {
                                    ++nb;
                                    resource.mimeType(targetSource, function (e, mimeType) { return process.nextTick(function () {
                                        if (!e)
                                            tags.getcontenttype.el.add(mimeType);
                                        nbOut(e);
                                    }); });
                                }
                                if (tags.getcontentlength.value) {
                                    ++nb;
                                    resource.size(targetSource, function (e, size) { return process.nextTick(function () {
                                        if (!e)
                                            tags.getcontentlength.el.add(size === undefined || size === null || size.constructor !== Number ? 0 : size);
                                        nbOut(e);
                                    }); });
                                }
                            }
                            nbOut();
                        });
                    }); });
                    displayValue('displayname', function () {
                        var methodDisplayName = resource.webName;
                        if (resource.displayName)
                            methodDisplayName = resource.displayName;
                        methodDisplayName.bind(resource)(function (e, name) { return process.nextTick(function () {
                            if (!e)
                                tags.displayname.el.add(name ? name : '');
                            nbOut(e);
                        }); });
                    });
                    displayValue('supportedlock', function () {
                        resource.availableLocks(function (e, lockKinds) { return process.nextTick(function () {
                            if (e) {
                                nbOut(e);
                                return;
                            }
                            lockKinds.forEach(function (lockKind) {
                                var lockentry = tags.supportedlock.el.ele('D:lockentry');
                                var lockscope = lockentry.ele('D:lockscope');
                                lockscope.ele('D:' + lockKind.scope.value.toLowerCase());
                                var locktype = lockentry.ele('D:locktype');
                                locktype.ele('D:' + lockKind.type.value.toLowerCase());
                            });
                            nbOut();
                        }); });
                    });
                    displayValue('getlastmodified', function () {
                        resource.lastModifiedDate(function (e, lastModifiedDate) { return process.nextTick(function () {
                            if (!e && tags.getlastmodified.value)
                                tags.getlastmodified.el.add(new Date(lastModifiedDate).toUTCString());
                            nbOut(e);
                        }); });
                    });
                    displayValue('getetag', function () {
                        resource.etag(function (e, etag) { return process.nextTick(function () {
                            if (!e && tags.getetag.value)
                                tags.getetag.el.add(etag);
                            nbOut(e);
                        }); });
                    });
                    ++nb;
                    process.nextTick(function () {
                        resource.propertyManager(function (e, pm) {
                            if (e)
                                return nbOut(e);
                            pm.getProperties(function (e, properties) {
                                if (e)
                                    return nbOut(e);
                                for (var name_1 in properties) {
                                    if (reqBody.mustDisplay(name_1)) {
                                        var tag = prop.ele(name_1);
                                        if (reqBody.mustDisplayValue(name_1))
                                            tag.add(properties[name_1]);
                                    }
                                }
                                nbOut();
                            });
                        });
                    });
                    nbOut();
                    //})
                }
                function done(multistatus) {
                    ctx.setCode(WebDAVRequest_1.HTTPCodes.MultiStatus);
                    ctx.writeBody(multistatus);
                    callback();
                }
            });
        });
    };
    default_1.prototype.isValidFor = function (type) {
        return !!type;
    };
    return default_1;
}());
exports.default = default_1;