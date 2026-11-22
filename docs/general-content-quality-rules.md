# General content quality rules

Rules that every prompt in the catalogue and every posted prompt should follow to produce good results. Each rule says what the prompt must do and why.

## Guarantee the prompt is loaded in the agent's context

**Rule:** every prompt must record its plan about what it is about to do in a file, and must re-read that file at the end of the run to verify the result. It must not rely on what it remembers, because in a long run the agent's context can spill and earlier instructions can be lost when the conversation is compacted, and details the agent only remembers can vanish silently. A file on disk survives compaction, and re-reading it at the end turns the check into a comparison with the source of truth instead of a guess.

**Example:** the `visual-identity-aligner` skill (`C:\Users\KARIN\.agents\skills\visual-identity-aligner\SKILL.md`).

## Avoid abstract instructions

**Rule:** a prompt must not give philosophical or abstract instructions; it states what the output has to satisfy in concrete, checkable terms. Abstract guidance gives the model nothing it can verify its result against, so it has to guess what is meant, which adds tokens and latency without improving the result.

## Define criteria, not the reasoning process

**Rule:** a prompt must define the architectural criteria the result has to meet, not try to replicate the model's internal thought process. Forcing deterministic models to emulate non-linear human reasoning creates cognitive friction, leading to higher latency and token bleed without improving the results, so it is more efficient to define the criteria instead.
