// ==UserScript==
// @name         Workshop Collection Helper
// @version      0.1
// @description  Improve features for steam workshop collections
// @author       zulc22
// @match        https://steamcommunity.com/sharedfiles/managecollection*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=steamcommunity.com
// @grant        none
// @downloadURL  https://github.com/zulc22/collectionhelper/raw/main/collectionhelper.user.js
// @updateURL    https://github.com/zulc22/collectionhelper/raw/main/collectionhelper.user.js
// ==/UserScript==

(function() {
    'use strict';

    jQuery("<button id='remall'>Remove all</button>").insertAfter('.manageItemsTitle:first');
    jQuery("<button id='addallsub'>Add all subscribed</button>").insertAfter('#MySubscribedItemsTab');
    jQuery('body').append(jQuery('<div id="_MESSAGE" style="white-space:pre-line;display:float;position:fixed;top:16px;left:16px;background:white;color:black;padding:16px;width:200px;text-align:left;z-index:999"></div>'));
    jQuery('#_MESSAGE').hide();

    function show_status() {
        jQuery('#_MESSAGE').show();
    }
    function hide_status() {
        jQuery('#_MESSAGE').hide();
    }
    function set_status(t) {
        jQuery('#_MESSAGE').text(t);
    }

    async function remove_all_items() {
        set_status("...");
        show_status();
        var items = jQuery('#sortable_items * a.delete');
        var items_length = items.length;
        var items_args = [];
        items.each((n,i)=>{
            // get arguments from onclick to pass to add_child_collection
            var arg = i.href.match(/Remove.*\)/)[0].split(' ').slice(1,-1)[0].slice(1,-1);
            items_args.push(arg);
        });
        var n = 0;
        var nsplit = 0;
        var splitjob = 6;
        var jobs = [];
        var jobs_desc = "";
        for (const i of items_args) {
            jobs_desc += jQuery('#sharedfile_'+i+' div .workshopItemTitle').text() + "\n";
            set_status(`${++n} of ${items_length} items removed... (${Math.round(n/items_length*100)}%)\n${jobs_desc}`);
            jobs.push(remove_child_collection(i));
            if (nsplit++==splitjob){
                nsplit=0;
                jobs_desc="";
                await Promise.all(jobs);
            }
        }
        set_status("Done!");
        setTimeout(()=>{
            hide_status();
        },2000);
    }

    async function add_all_subscribed() {
        set_status("...");
        show_status();
        // all subscribed items not already in the collection
        var items = jQuery('#MySubscribedItems .itemChoice').not('.inCollection');
        var items_length = items.length;
        var items_args = [];
        items.each((n,i)=>{
            // get arguments from onclick to pass to add_child_collection
            var args = i.onclick.toString().match(/Add.*\)/)[0].split(' ').slice(1,-1);
            var args2 = [];
            args.forEach(j => {
                if (j.endsWith(',')) j=j.slice(0,-1)
                j=j.slice(1,-1);
                args2.push(j);
            });
            items_args.push(args2);
        });
        var n = 0;
        var nsplit = 0;
        var splitjob = 6;
        var jobs = [];
        var jobs_desc = "";
        for (const i of items_args) {
            jobs_desc += jQuery('#'+i[0]+' .itemChoiceTitle').text() + "\n";
            set_status(`${++n} of ${items_length} items added... (${Math.round(n/items_length*100)}%)\n${jobs_desc}`);
            jobs.push(add_child_collection(i[0],i[1]));
            if (nsplit++==splitjob){
                nsplit=0;
                jobs_desc="";
                await Promise.all(jobs);
            }
        }
        set_status("Done!");
        setTimeout(()=>{
            hide_status();
        },2000);
    }

    function get_collection_id() {
        return location.href.match(/id=\d*?&/)[0].slice(3,-1);
    }

    // patched off of AddSpecifiedChildToCollection
    function add_child_collection( elemID, childID )
    {
        var elem = $( elemID );
        if ( elem.hasClassName( "inCollection" ) )
            return;

        var warning = $J( "#noChildItemsWarning" );
        if ( warning )
        {
            warning.hide();
        }

        var controls = $J( "#editCollectionControls" );
        controls.show();

        var params = {
            id: get_collection_id(),
            childid: childID,
            sessionid: g_sessionID,
        };
        return new Promise(resolve => {
            var p = $J.post( 'https://steamcommunity.com/sharedfiles/addchild', params ).done( function( result ) {
                if ( result.success == 1 )
                {
                    var fileType = result.fileType;
                    var elContainer = $J( result.fileType == 2 ? '#sortable_child_collections' : '#sortable_items' );
                    elContainer.append( result.html );

                    if ( result.fileType == 2 )
                    {
                        Sortable.create( 'sortable_child_collections', { tag: 'div', overlap: 'horizontal', constraint: false, onUpdate: OnChildCollectionsReorder } );
                    }
                    else
                    {
                        Sortable.create( 'sortable_items', { tag: 'div', overlap: 'horizontal',	constraint: false, onUpdate: OnChildItemsReorder } );
                    }

                    var listItems = [ "choice_MyItems_" + childID, "choice_MyFavoriteItems_" + childID, "choice_MySubscribedItems_" + childID ];
                    for ( var i = 0; i < listItems.length; ++i )
                    {
                        var listElem = $( listItems[i] );
                        if ( listElem )
                        {
                            listElem.addClassName( "inCollection" );
                        }
                    }
                    resolve();
                }
            });
        });
    }

    // patched off of RemoveChildFromCollection
    function remove_child_collection( childID )
    {
        return new Promise(resolve => {
            var elemID = "sharedfile_" + childID;
            var options = {
                method: 'post',
                postBody: 'id=' + get_collection_id() + '&sessionid=' + g_sessionID + '&childid=' + childID + '&ajax=true',
                onSuccess: function(transport)
                {
                    var json = transport.responseText.evalJSON();
                    switch ( json['success'] )
                    {
                        case 1:
                            $( elemID ).remove();
                            var listItems = [ "choice_MyItems_" + childID, "choice_MyFavoriteItems_" + childID, "choice_MySubscribedItems_" + childID ];
                            for ( var i = 0; i < listItems.length; ++i )
                            {
                                var listElem = $( listItems[i] );
                                if ( listElem )
                                {
                                    listElem.removeClassName( "inCollection" );
                                }
                            }
                            resolve();
                            break;
                        default:
                            alert( "Failure code: " + json['success'] );
                            break;
                    }
                }
            };
            new Ajax.Request(
                'https://steamcommunity.com/sharedfiles/removechild',
                options
            );
        });
    }

    jQuery("#remall").on('click',remove_all_items);
    jQuery("#addallsub").on('click',add_all_subscribed);

})();
