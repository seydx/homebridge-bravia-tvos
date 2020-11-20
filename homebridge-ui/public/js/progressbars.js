const fetchInputsBar = new ProgressBar.Circle('#fetchInputsBar', {
  color: '#aaa',
  strokeWidth: 4,
  trailWidth: 1,
  easing: 'easeInOut',
  duration: 1400,
  text: {
    value: 'Applications..',
    style: {
      color: '#909090',
      position: 'absolute',
      left: '50%',
      top: '50%',
      padding: 0,
      margin: 0,
      fontFamily: 'Roboto,sans-serif',
      fontSize: '0.8rem',
      transform: {
        prefix: true,
        value: 'translate(-50%, -50%)'
      }
    },
    autoStyleContainer: false
  },
  from: { color: '#32CD32', width: 1 },
  to: { color: '	#7CFC00', width: 4 },
  step: function(state, circle) {
    circle.path.setAttribute('stroke', state.color);
    circle.path.setAttribute('stroke-width', state.width);
    var value = Math.round(circle.value() * 100);
    if(value === 100){
      circle.setText('Stored!');
    } else if(value >= 80){
      circle.setText('Storing..');
    } else if(value >= 60){
      circle.setText('Commands..');
    } else if(value >= 40){
      circle.setText('Channels..');
    } else if(value >= 20){
      circle.setText('Inputs..');
    }
  }
});

const timerBar = new ProgressBar.Circle('#timerBar', {
  color: '#aaa',
  strokeWidth: 4,
  trailWidth: 1,
  easing: 'easeInOut',
  duration: 1400,
  text: {
    value: 'Applications..',
    style: {
      color: '#909090',
      position: 'absolute',
      left: '50%',
      top: '50%',
      padding: 0,
      margin: 0,
      fontFamily: 'Roboto,sans-serif',
      fontSize: '1rem',
      transform: {
        prefix: true,
        value: 'translate(-50%, -50%)'
      }
    },
    autoStyleContainer: false
  },
  from: { color: '#ff0400', width: 3 },
  to: { color: '#00eb5e', width: 3 },
  step: function(state, circle) {
    circle.path.setAttribute('stroke', state.color);
    circle.path.setAttribute('stroke-width', state.width);
    var value = Math.round((circle.value() * 100) / 1.67);
    circle.setText(value);
  }
});