<template lang="pug">
  .base-timer
    svg.base-timer__svg(
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    )
      g.base-timer__circle
        circle.base-timer__path-elapsed(
          cx="50" 
          cy="50" 
          r="45"
        )
        path.base-timer__path-remaining(
          :stroke-dasharray="circleDasharray"
          :class="remainingPathColor"
          d="M 50, 50 m -45, 0 a 45,45 0 1,0 90,0 a 45,45 0 1,0 -90,0"
        )
    span.base-timer__label {{ formattedTimeLeft }}
</template>

<script>
const FULL_DASH_ARRAY = 283;

export default {
  props: {
    timeLeft: {
      type: Number,
      required: true,
    },
    timeLimit: {
      type: Number,
      defualt: 60,
      required: true,
    },
    alertThreshold: {
      type: Number,
      defualt: 10,
      required: true,
    },
    warningThreshold: {
      type: Number,
      defualt: 20,
      required: true,
    },
  },
  data() {
    return {
      colorCodes: {
        info: {
          color: 'green',
        },
        warning: {
          color: 'orange',
          threshold: this.warningThreshold,
        },
        alert: {
          color: 'red',
          threshold: this.alertThreshold,
        },
      },
      timePassed: 0,
      timerInterval: null,
    };
  },
  computed: {
    circleDasharray() {
      return `${(this.timeFraction * FULL_DASH_ARRAY).toFixed(0)} 283`;
    },
    formattedTimeLeft() {
      const timeLeft = this.timeLeft;
      const minutes = Math.floor(timeLeft / 60);
      let seconds = timeLeft % 60;

      if (seconds < 10) {
        seconds = `0${seconds}`;
      }

      return `${minutes}:${seconds}`;
    },
    timeFraction() {
      const rawTimeFraction = this.timeLeft / this.timeLimit;
      return rawTimeFraction - (1 / this.timeLimit) * (1 - rawTimeFraction);
    },
    remainingPathColor() {
      const { alert, warning, info } = this.colorCodes;

      if (this.timeLeft <= alert.threshold) {
        return alert.color;
      } else if (this.timeLeft <= warning.threshold) {
        return warning.color;
      } else {
        return info.color;
      }
    },
  },
};
</script>

<style scoped lang="scss">
.base-timer {
  position: relative;
  width: 50px;
  height: 50px;
  margin: 0 auto;

  &__svg {
    transform: scaleX(-1);
  }

  &__circle {
    fill: none;
    stroke: none;
  }

  &__path-elapsed {
    stroke-width: 7px;
    stroke: grey;
  }

  &__path-remaining {
    stroke-width: 7px;
    stroke-linecap: round;
    transform: rotate(90deg);
    transform-origin: center;
    transition: 1s linear all;
    fill-rule: nonzero;
    stroke: currentColor;

    &.green {
      color: #11d83d;
    }

    &.orange {
      color: orange;
    }

    &.red {
      color: red;
    }
  }

  &__label {
    position: absolute;
    width: 50px;
    height: 50px;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 900;
  }
}
</style>
