/// LICENCE -----------------------------------------------------------------------------
//
// Copyright 2018 - Cédric Batailler
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this
// software and associated documentation files (the "Software"), to deal in the Software
// without restriction, including without limitation the rights to use, copy, modify,
// merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to the following
// conditions:
//
// The above copyright notice and this permission notice shall be included in all copies
// or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
// CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
// OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// OVERVIEW -----------------------------------------------------------------------------
//
// TODO:
// 
// dirty hack to lock scrolling ---------------------------------------------------------
// note that jquery needs to be loaded.
/*
$('body').css({'overflow':'hidden'});
  $(document).bind('scroll',function () { 
       window.scrollTo(0,0); 
  });
*/
// safari & ie exclusion ----------------------------------------------------------------
var is_safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
var is_ie = /*@cc_on!@*/false || !!document.documentMode;

var is_compatible = !(is_safari || is_ie);


if(!is_compatible) {

    var safari_exclusion = {
        type: "html-keyboard-response",
        stimulus:
        "<p>Sorry, this study is not compatible with your browser.</p>" +
        "<p>Please try again with a compatible browser (e.g., Chrome or Firefox).</p>",
        choices: jsPsych.NO_KEYS
    };

    var timeline_safari = [];

    timeline_safari.push(safari_exclusion);
    jsPsych.init({timeline: timeline_safari});

}

// firebase initialization ---------------------------------------------------------------
  var firebase_config = {
        apiKey: "AIzaSyBwDr8n-RNCbBOk1lKIxw7AFgslXGcnQzM",
        databaseURL: "https://postdocgent.firebaseio.com/"
  };

  firebase.initializeApp(firebase_config);
  var database = firebase.database();

  // prolific variables
  var prolificID = jsPsych.data.getURLVariable("PROLIFIC_PID");
  if(prolificID == null) {prolificID = "999";}
  var jspsych_id = jsPsych.randomization.randomID(15); // short ID

  // connection status ---------------------------------------------------------------------
  // This section ensure that we don't lose data. Anytime the 
  // client is disconnected, an alert appears onscreen
  var connectedRef = firebase.database().ref(".info/connected");
  var connection   = firebase.database().ref("IAT/" + jspsych_id + "/")
  var dialog = undefined;
  var first_connection = true;

  connectedRef.on("value", function(snap) {
    if (snap.val() === true) {
      connection
        .push()
        .set({status: "connection",
              timestamp: firebase.database.ServerValue.TIMESTAMP})

      connection
        .push()
        .onDisconnect()
        .set({status: "disconnection",
              timestamp: firebase.database.ServerValue.TIMESTAMP})

    if(!first_connection) {
      dialog.modal('hide');
    }
    first_connection = false;
    } else {
      if(!first_connection) {
      dialog = bootbox.dialog({
          title: 'Connection lost',
          message: '<p><i class="fa fa-spin fa-spinner"></i> Please wait while we try to reconnect.</p>',
          closeButton: false
          });
    }
    }
  });

    // counter variables
  var iat_trial_n      = 1;
  var browser_events_n = 1;

// Variable input -----------------------------------------------------------------------
// Variable used to define experimental condition.

//var iat_att    = jsPsych.randomization.sampleWithoutReplacement(["left", "right"], 1)[0];; // either "left" or "right"
//var iat_adju_pot = jsPsych.randomization.sampleWithoutReplacement(["left", "right"], 1)[0];; // either "left" or "right"

var pairing_att = jsPsych.randomization.sampleWithoutReplacement(["adjustment_left", "potency_left", "adjustment_right", "potency_right"], 1)[0];; // either "left" or "right"

 // cursor helper functions
var hide_cursor = function() {
	document.querySelector('head').insertAdjacentHTML('beforeend', '<style id="cursor-toggle"> html { cursor: none; } </style>');
}
var show_cursor = function() {
	document.querySelector('#cursor-toggle').remove();
}

var hiding_cursor = {
    type: 'call-function',
    func: hide_cursor
}

var showing_cursor = {
    type: 'call-function',
    func: show_cursor
}

// Saving blocks ------------------------------------------------------------------------
// Every function here send the data to keen.io. Because data sent is different according
// to trial type, there are differents function definition.

// init ---------------------------------------------------------------------------------
  var saving_id = function(){
     database
        .ref("iat_participant_id/")
        .push()
        .set({jspsych_id: jspsych_id,
               prolificID: prolificID,
               pairing_att: pairing_att,
               timestamp: firebase.database.ServerValue.TIMESTAMP})
  }

  // iat trial ----------------------------------------------------------------------------
  var saving_iat_trial = function(){
    database
      .ref("iat_trial/")
      .push()
      .set({jspsych_id: jspsych_id,
          prolificID: prolificID,
          pairing_att: pairing_att,
          timestamp: firebase.database.ServerValue.TIMESTAMP,
          iat_trial_data: jsPsych.data.get().last().json()})
  }

// demographic logging ------------------------------------------------------------------

  var saving_browser_events = function(completion) {
    database
     .ref("iat_browser_event/")
     .push()
     .set({jspsych_id: jspsych_id,
      prolificID: prolificID,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      pairing_att: pairing_att,
      completion: completion,
      event_data: jsPsych.data.getInteractionData().json()})
  }



// saving blocks ------------------------------------------------------------------------
var save_id = {
    type: 'call-function',
    func: saving_id
}

var save_iat_trial = {
    type: 'call-function',
    func: saving_iat_trial
}


// iat sampling function ----------------------------------------------------------------
var sample_n_iat = function(list, n) {
  list = jsPsych.randomization.sampleWithoutReplacement(list, n);
  list = jsPsych.randomization.shuffleNoRepeats(list);

  return(list);
}

// EXPERIMENT ---------------------------------------------------------------------------

// Consent --------------------------------------------------------------
  var check_consent = function(elem) {
    if (document.getElementById('info').checked 
      & document.getElementById('volunt').checked 
      & document.getElementById('anony').checked 
      & document.getElementById('end').checked 
      & document.getElementById('consqc').checked 
      & document.getElementById('summ').checked 
      & document.getElementById('participate').checked ) {
      return true;
    }
    else {
      alert("If you wish to participate, you must check all the boxes.");
      return false;
    }
    return false;
  };


  var consent = {
    type:'external-html',
    url: "https://marinerougier.github.io/Ugent_1/external_page_consent.html",
    cont_btn: "start",
    check_fn: check_consent,
        on_load: function() {
          window.scrollTo(0, 0)
        },
  };

/*
  var consent = {
    type:'external-html',
    url: "https://marinerougier.github.io/Ugent_1/external_page_consent.html",
    cont_btn: "start",
    check_fn: check_consent,
        on_load: function() {
          window.scrollTo(0, 0);
          $(".jspsych-content").css("text-align", "justify");
          $(".jspsych-content").css("max-width", "80%");
        },
  };
*/
// Switching to fullscreen --------------------------------------------------------------
var fullscreen_trial = {
  type: 'fullscreen',
  message:  'To start please switch again to full screen </br></br>',
  button_label: 'Switch to fullscreen',
  fullscreen_mode: true,
        on_load: function() {
          window.scrollTo(0, 0);
          $(".").css("text-align", "justify");
          $(".jspsych-content").css("max-width", "80%");
        },
}


// IAT -----------------------------------------------------------------------------------
// IAT variable initialization ----------------------------------------------------------
// Correct responses -----------------------
var att_side      = undefined;
var empty_side     = undefined;
var Adjust_side_1st = undefined;
var Potency_side_1st  = undefined;

// Label -----------------------------------
var block_3_left_label_top      = undefined;
var block_3_right_label_top     = undefined;
var block_3_left_label_bottom   = undefined;
var block_3_right_label_bottom  = undefined;

switch(pairing_att) {
  case "adjustment_left":
        att_side               = "left";
        empty_side              = "right";
        Adjust_side_1st = "left";
        Potency_side_1st  = "right";

        block_3_left_label_bottom  = "Attractiveness";
        block_3_right_label_bottom = " ";
        block_3_left_label_top   = "Adjustment";
        block_3_right_label_top  = "Potency";
    break;

  case "adjustment_right":
        att_side               = "right";
        empty_side              = "left";
        Adjust_side_1st = "right";
        Potency_side_1st  = "left";

        block_3_left_label_bottom  = " ";
        block_3_right_label_bottom = "Attractiveness";
        block_3_left_label_top   = "Potency";
        block_3_right_label_top  = "Adjustment";
    break;
  case "potency_left":
        att_side               = "left";
        empty_side              = "right";
        Adjust_side_1st = "right";
        Potency_side_1st  = "left";

        block_3_left_label_bottom  = "Attractiveness";
        block_3_right_label_bottom = " ";
        block_3_left_label_top   = "Potency";
        block_3_right_label_top  = "Attractiveness";
    break;

  case "potency_right":
        att_side               = "right";
        empty_side              = "left";
        Adjust_side_1st = "left";
        Potency_side_1st  = "right";

        block_3_left_label_bottom  = " ";
        block_3_right_label_bottom = "Attractiveness";
        block_3_left_label_top   = "Adjustment";
        block_3_right_label_top  = "Potency";
    break;
}


// To alternate good/bad and black/white trials ---------------------------------------------------------------------
var shuffleIATstims = function (stims) {
    // Alterenate categories blackWhite vs. goodBad
    var n = stims.length / 2;
    var chunkedStims = _.chunk(stims, n);
    var stims1 = jsPsych.randomization.shuffleNoRepeats(chunkedStims[0]);
    var stims2 = jsPsych.randomization.shuffleNoRepeats(chunkedStims[1]);

    var stims12 = stims1.map(function (e, i) { // merge two arrays so that the values alternate
        return [e, stims2[i]];
    });
    var stims21 = stims2.map(function (e, i) {
        return [e, stims1[i]];
    });

    var t = _.sample([stims12, stims21]);
    t = _.flattenDeep(t);

    return t;
};


// iat instructions ---------------------------------------------------------------------
var instructions_gene = {
  type: "html-keyboard-response",
  stimulus:
    "<h1 class ='custom-title'> About this study </h1>" +
    "<p class='instructions'>This study is divided into two separate parts. " +
    "</p>" +
    "<p class='instructions'>You can quit the study at any time by closing the browser window. However, please be aware " +
    "that this will <b>end your participation</b>. If you are certain that you want to quit or encounter technical issues "+
    "that force you to quit, <b>you can still receive a partial reward proportionate to the time you actually spent</b> on "+
    "the study. If this occurs, please take the following steps: Return the study via the Prolific study page as "+
    "quickly as possible (please do not submit unless you have completed the study and received a completion code). "+
    "Send a message to the researcher via the Prolific study page, stating that you completed part of the study "+
    "(this will ensure that the researcher knows you should receive a partial reward). </br></br></p>" +
    "<p class = 'continue-instructions'>Press <span class='key'>space</span>" +
    " to continue.</p>",
  choices: [32]
};

var iat_instructions_1 = {
  type: "html-keyboard-response",
  stimulus:
    "<h1 class ='custom-title'> Part 1: Categorization task </h1>" +
    "<p class='instructions'>In this task, you will be asked to sort words" +
    " into groups as accurately as you can using the keyboard. In the following screen you will be presented" +
    " a list of category labels and the items that belong to each of these categories." +
    "</p>" +
    "<p class='instructions'>As you will see, you will have to sort" +
    " words depending on whether these ones refer to physical attractiveness, adjustment, or potency.</p>" +
    "<h3 class='instructions'>Instructions</h3>" +
    "<ul class='instructions'>" +
      "<li>Keep fingers on the <span class='key'>E</span> and <span class='key'>I</span>.</li>" +
      "<li>Labels at the top will tell you which items go with each key.</li>" +
      "<li>Be as accurate as you can.</li>" +
    "</ul>" +
    "<p>&nbsp;</p>" +
    "<p class = 'continue-instructions'>Press <span class='key'>space</span>" +
    " to continue.</p>",
  choices: [32]
};

var iat_instructions_1_1 = {
  type: "html-keyboard-response",
  stimulus:
    "<h1 class ='custom-title'> Part 1: Categorization task </h1>" +
    "<p class='instructions'><center>Here are the three categories and the items belonging to each category</center></p>" +
    "<table>" +
      "<tr>" +
        "<th width='200px'>Category</th>" +
        "<th align='left'>Item</th>" +
      "</tr>" +
      "<tr>" +
        "<td>Attractiveness</td>" +
        "<td align='left'>Good-looking, Hideous, Handsome, Ugly</td>" +
      "</tr>" +
      "<tr>" +
        "<td>Adjustment</td>" +
        "<td align='left'>Maladjusted, Satisfied, Miserable, Healthy</td>" +
      "</tr>" +
      "<tr>" +
      "<br>"+
        "<td>Potency</td>" +
        "<td align='left'>Weak, Self-assertive, Submissive, Leader</td>" +
      "</tr>" +
    "</table>" +
    "<br>" +
    "<br>" +
    "<p class = 'continue-instructions'>Press <span class='key'>space</span>" +
    " to continue.</p>",
  choices: [32]
};

// Potency: here, we changed Strong = Weak & Dominant = submissive
// Adjustment: here, we changed Well-adjusted = maladjusted & Happy = Miserable


// iat block instructions ---------------------------------------------------------------

var iat_instructions_block_3 = {
  type: 'html-keyboard-response',
  stimulus:
  "<div style='position: absolute; top: 18%; left: 20%'><p>" +
    "Press <span class='key'>E</span> for words relating to:<br> " +
    "<span class='iat-category good-bad'>" + block_3_left_label_top  + "</span>" +
    "<br>" +
    "<span class='iat-category good-bad'>" + block_3_left_label_bottom + "</span>" +
  "</p></div>" +
  "<div style='position: absolute; top: 18%; right: 20%'><p>" +
    "Press <span class='key'>I</span>  for words relating to:<br>" +
    "<span class='iat-category good-bad'>" + block_3_right_label_top + "</span>" +
    "<br>" +
    "<span class='iat-category good-bad'>" + block_3_right_label_bottom  + "</span>" +
  "</p></div>" +
  "<div class='iat-instructions' style='position: relative; top: 42%'> "+
    "<p class='instructions'>" +
    "Remember, each item belongs to only one group." +
    "</p>" +
    "<p class='instructions'>" +
    "Use the <span class='key'>E</span> and <span class='key'>I</span> keys to categorize " +
    "items into the four groups left and right, and correct errors by hitting the other key." +
    "</p>" +
  "</div> " +
  "<br />" +
  "<br>" +
  "<p class = 'continue-instructions'>Press <span class='key'>space bar</span> when you are ready to start.</p>",
  choices: [32]
};

// iat - stimuli ------------------------------------------------------------------------
var iat_block_3_stim_AttAdj = [
  {category: "att_empty",      stimulus: "Good-looking",        stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Hideous",             stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Handsome",            stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Ugly",                stim_key_association: att_side},
  {category: "adjust_potency", stimulus: "Maladjusted",       stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Satisfied",           stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Miserable",               stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Healthy",             stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Weak",              stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Self-assertive",      stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Submissive",            stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Leader",              stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Weak",              stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Self-assertive",      stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Submissive",            stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Leader",              stim_key_association: Potency_side_1st},
  {category: "att_empty",      stimulus: "Good-looking",        stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Hideous",             stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Handsome",            stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Ugly",                stim_key_association: att_side},
  {category: "adjust_potency", stimulus: "Maladjusted",       stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Satisfied",           stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Miserable",               stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Healthy",             stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Weak",              stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Self-assertive",      stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Submissive",            stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Leader",              stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Weak",              stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Self-assertive",      stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Submissive",            stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Leader",              stim_key_association: Potency_side_1st},
  {category: "att_empty",      stimulus: "Good-looking",        stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Hideous",             stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Handsome",            stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Ugly",                stim_key_association: att_side},
  {category: "adjust_potency", stimulus: "Maladjusted",       stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Satisfied",           stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Miserable",               stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Healthy",             stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Weak",              stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Self-assertive",      stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Submissive",            stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Leader",              stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Weak",              stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Self-assertive",      stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Submissive",            stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Leader",              stim_key_association: Potency_side_1st}
]

var iat_block_3_stim_AttPot = [
  {category: "att_empty",      stimulus: "Good-looking",        stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Hideous",             stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Handsome",            stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Ugly",                stim_key_association: att_side},
  {category: "adjust_potency", stimulus: "Maladjusted",       stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Satisfied",           stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Miserable",               stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Healthy",             stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Maladjusted",       stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Satisfied",           stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Miserable",               stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Healthy",             stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Weak",              stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Self-assertive",      stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Submissive",            stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Leader",              stim_key_association: Potency_side_1st},
  {category: "att_empty",      stimulus: "Good-looking",        stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Hideous",             stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Handsome",            stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Ugly",                stim_key_association: att_side},
  {category: "adjust_potency", stimulus: "Maladjusted",       stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Satisfied",           stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Miserable",               stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Healthy",             stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Maladjusted",       stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Satisfied",           stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Miserable",               stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Healthy",             stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Weak",              stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Self-assertive",      stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Submissive",            stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Leader",              stim_key_association: Potency_side_1st},
  {category: "att_empty",      stimulus: "Good-looking",        stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Hideous",             stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Handsome",            stim_key_association: att_side},
  {category: "att_empty",      stimulus: "Ugly",                stim_key_association: att_side},
  {category: "adjust_potency", stimulus: "Maladjusted",       stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Satisfied",           stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Miserable",               stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Healthy",             stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Maladjusted",       stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Satisfied",           stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Miserable",               stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Healthy",             stim_key_association: Adjust_side_1st},
  {category: "adjust_potency", stimulus: "Weak",              stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Self-assertive",      stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Submissive",            stim_key_association: Potency_side_1st},
  {category: "adjust_potency", stimulus: "Leader",              stim_key_association: Potency_side_1st}
]

// iat - block 3 (test) -----------------------------------------------------------------orginally 74 trials over 8 stim
var iat_block_3_AttAd = {
  timeline: [
    {
      type: 'iat-html',
      stimulus: jsPsych.timelineVariable('stimulus'),
      category: jsPsych.timelineVariable('category'),
      label_category: ['att_empty', 'adjust_potency'],
      stim_key_association: jsPsych.timelineVariable('stim_key_association'),
      html_when_wrong: '<span style="color: red; font-size: 80px">&times;</span>',
      force_correct_key_press: true,
      display_feedback: true,
      left_category_label:  [block_3_left_label_top, block_3_left_label_bottom],
      right_category_label: [block_3_right_label_top, block_3_right_label_bottom],
      response_ends_trial: true,
      data: {
        iat_type: 'test',
        iat_block: 3,
        iat_label_left:  block_3_left_label_top  + "-" + block_3_left_label_bottom,
        iat_label_right: block_3_right_label_top + "-" + block_3_right_label_bottom
         }
    },
    save_iat_trial
  ],
  timeline_variables: shuffleIATstims(iat_block_3_stim_AttAdj)
}

var iat_block_3_stim_AttPot = {
  timeline: [
    {
      type: 'iat-html',
      stimulus: jsPsych.timelineVariable('stimulus'),
      category: jsPsych.timelineVariable('category'),
      label_category: ['att_empty', 'adjust_potency'],
      stim_key_association: jsPsych.timelineVariable('stim_key_association'),
      html_when_wrong: '<span style="color: red; font-size: 80px">&times;</span>',
      force_correct_key_press: true,
      display_feedback: true,
      left_category_label:  [block_3_left_label_top, block_3_left_label_bottom],
      right_category_label: [block_3_right_label_top, block_3_right_label_bottom],
      response_ends_trial: true,
      data: {
        iat_type: 'test',
        iat_block: 3,
        iat_label_left:  block_3_left_label_top  + "-" + block_3_left_label_bottom,
        iat_label_right: block_3_right_label_top + "-" + block_3_right_label_bottom
         }
    },
    save_iat_trial
  ],
  timeline_variables: shuffleIATstims(iat_block_3_stim_AttPot)
}

//
var iat_instructions_2 = {
  type: "html-keyboard-response",
  stimulus:
    "<p><center>This task is completed.</center></p>" +
    "<br>" +
    "<p class = 'continue-instructions'>Press <strong>space</strong> to continue to the second task.</p>",
  choices: [32]
};


// end fullscreen -----------------------------------------------------------------------

var fullscreen_trial_exit = {
  type: 'fullscreen',
  fullscreen_mode: false
}


// procedure ----------------------------------------------------------------------------
// Initialize timeline ------------------------------------------------------------------

var timeline = [];

// fullscreen
timeline.push(
        //consent,
        instructions_gene,
        fullscreen_trial,
			  hiding_cursor);

// prolific verification
timeline.push(save_id);

switch(pairing_att) {
  case "adjustment_left":
    timeline.push(iat_instructions_1,
                  iat_instructions_1_1,
                  iat_instructions_block_3, 
                  iat_block_3_AttAd,
                  iat_instructions_2);
break;
  case "adjustment_right":
    timeline.push(iat_instructions_1,
                  iat_instructions_1_1,
                  iat_instructions_block_3, 
                  iat_block_3_AttAd,
                  iat_instructions_2);  
break;
  case "potency_right":
    timeline.push(iat_instructions_1,
                  iat_instructions_1_1,
                  iat_instructions_block_3, 
                  iat_block_3_stim_AttPot,
                  iat_instructions_2);  
break;
  case "potency_right":
    timeline.push(iat_instructions_1,
                  iat_instructions_1_1,
                  iat_instructions_block_3, 
                  iat_block_3_stim_AttPot,
                  iat_instructions_2);  
break;
}

timeline.push(showing_cursor);

timeline.push(fullscreen_trial_exit);

// Launch experiment --------------------------------------------------------------------
// preloading ---------------------------------------------------------------------------
// Preloading. For some reason, it appears auto-preloading fails, so using it manually.
// In principle, it should have ended when participants starts VAAST procedure (which)
// contains most of the image that have to be pre-loaded.
var loading_gif               = ["media/loading.gif"]

jsPsych.pluginAPI.preloadImages(loading_gif);

// timeline initiaization ---------------------------------------------------------------

if(is_compatible) {
  jsPsych.init({
      timeline: timeline,
      on_interaction_data_update: function() {
        saving_browser_events(completion = false);
      },
    on_finish: function() {
        saving_browser_events(completion = true);
        jsPsych.data.addProperties({
          //taskOrder: TaskOrder,
        });
        window.location.href = "https://marinerougier.github.io/Ugent_3/Rating_task/rating_task.html?jspsych_id=" + jspsych_id + "?prolificID="+ 
        prolificID + "?pairing_att=" + pairing_att;
    }
  });
}
