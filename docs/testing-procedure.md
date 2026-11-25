# Testing procedure

## 1 Test the prompts quickly without recording the tests

  To iterate quickly and get the prompt on a publishable state, run several tests without documenting the tests. The tester can just take short notes about improvements to do, and apply them to the prompt and test again until you get convinced of the output.
  Is it recommeded to start testing with the weakest model, if you achieve a good output with it, it will work fine for other models

## 2 Test formulation

  Once the skill gives outputs up to the expectations, a test procedure is set for it.

### Tests structure

```text
<skill-name>-testing/
  tests/
    v1.0/
      SKILL.md                      <- snapshot used for these runs
      b_nextjs_opencode_big-pickle_r01/
      ...
    v1.5/
      SKILL.md
      c_nextjs_claude-code_sonnet-5-5_r01/
        test.md                   <- "Skill version: v1.5" in Test details
        ...
```

### Versioning

Skill versions use the form `vMAJOR.MINOR`. The number tells you whether earlier test results still apply.

- **Major (integer, `v2.0`)**: the skill's procedure changes. This includes steps added, removed or reordered, inputs the skill asks for, rules added or removed, and changes to the output or file format. Results from different majors can't be compared, so every scenario must be re-run. A major bump resets the minor to `.0`.
- **Minor (decimal, `v1.5`)**: the procedure stays the same but the behaviour changes. This includes a rule reworded or tightened, a check added within an existing step, or an example or threshold changed. Re-run at least the scenarios the change affects.
- **No bump**: changes that cannot affect the outputs, such as typos, formatting or broken links. Record these in a changelog entry instead.

The first tested version is `v1.0`. Minor numbers go from `.0` to `.9` so that folders sort correctly (`v1.10` would sort before `v1.5`).

### Naming and recording experiments

Every prompt, skill or agent is run across different frameworks, AI agents and models. Each run is one experiment, and its data is recorded in `<name>-testing/tests/<version>/`.
#### Experiment ID

```
<scenario>_<framework>_<agent>_<model>_<run>
```

All lowercase, hyphens inside a part, underscores between parts.

| Part | Values | Notes |
|---|---|---|
| `scenario` | `a`, `b`, `c`, `d` | The scenario letter only. |
| `framework` | `nextjs`, `vite-react`, `astro`, `sveltekit`, … | The stack of the fixture project. |
| `agent` | `claude-code`, `codex`, `gemini-cli`, … | The tool that ran the test subject. |
| `model` | `sonnet-5-5`, `opus-5-5`, `haiku-5-5`, … | The exact model ID, never just the family name, because models change under the same name. |
| `run` | `r01`, `r02`, … | Repeats of the same combination. Agents are non-deterministic, so one run proves little. |

Examples:

- `a_nextjs_claude-code_sonnet-5-5_r01`
- `d_nextjs_claude-code_haiku-5-5_r01`
- `c_vite-react_codex_gpt-5_r02`

The order puts what is tested first, so runs of the same scenario sit together, and the parts that change most (model, run) last, so comparing models or repeats is a matter of reading adjacent names.

Keep the allowed values for `framework`, `agent` and `model` in one list in `<name>-testing/tests/README.md`, so the same value is always spelled the same way.

#### test.md file

The main information of each test is stored in its `test.md` file. That file holds the test details, the scores, the notes, and the usage and performance data of the test. The testing scenarios and the evaluation criteria are described in each subject's testing document.

## 3 Test run

  It is recommended to run each scenario in batches with different models. This streamline the test process since the scenario and the expected behaviour is the same for every model, so the tester can work step by step and evaluate in parallel with all the batch.
