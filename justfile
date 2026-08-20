# oh-my-deepseek-harness command runner
# Run `just` to list the available release and integration checks.

set unstable := true

default:
    @just --list

[group('clean-room host checks')]
[doc('Verify OrbStack/Docker, proto, and the clean-room version pins')]
cleanroom-doctor:
    proto run node -- scripts/integration/clean-room-hosts.mjs doctor

[group('clean-room host checks')]
[doc('Fresh-install and test Pi, OMP, and Hermes in disposable containers')]
cleanroom-all:
    proto run node -- scripts/integration/clean-room-hosts.mjs test all

[group('clean-room host checks')]
[doc('Fresh-install and test the Pi extension in a disposable container')]
cleanroom-pi:
    proto run node -- scripts/integration/clean-room-hosts.mjs test pi

[group('clean-room host checks')]
[doc('Fresh-install and test the OMP extension in a disposable container')]
cleanroom-omp:
    proto run node -- scripts/integration/clean-room-hosts.mjs test omp

[group('clean-room host checks')]
[doc('Fresh-install and test the Hermes plugin in a disposable container')]
cleanroom-hermes:
    proto run node -- scripts/integration/clean-room-hosts.mjs test hermes

[group('clean-room host checks')]
[doc('Show the newest clean-room evidence manifest and log directory')]
cleanroom-report:
    proto run node -- scripts/integration/clean-room-hosts.mjs report

[group('agent comparison bench')]
[doc('Verify OrbStack/Docker, proto, versions, and the optional model credential')]
comparison-doctor:
    proto run node -- scripts/integration/comparison-bench.mjs doctor

[group('agent comparison bench')]
[doc('Fresh-build the two Pi comparison images and screenshot evaluator')]
comparison-build:
    proto run node -- scripts/integration/comparison-bench.mjs build all

[group('agent comparison bench')]
[doc('Run both fresh Pi lanes and capture build, DOM, and screenshot evidence')]
comparison-all:
    proto run node -- scripts/integration/comparison-bench.mjs run all

[group('agent comparison bench')]
[doc('Run only the fresh Pi baseline lane and capture its evidence')]
comparison-baseline:
    proto run node -- scripts/integration/comparison-bench.mjs run pi-baseline

[group('agent comparison bench')]
[doc('Run only the fresh Pi plus DSH lane and capture its evidence')]
comparison-harness:
    proto run node -- scripts/integration/comparison-bench.mjs run pi-harness

[group('agent comparison bench')]
[doc('Show the newest comparison manifest and evidence directory')]
comparison-report:
    proto run node -- scripts/integration/comparison-bench.mjs report
