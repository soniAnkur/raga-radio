# Build an agent, one commit at a time

A small agent that makes a raga track from a chat message such as "something calm for this evening, with piano". It is one file, `agent.js`, with no packages to install. Each commit on this branch adds one idea.

| Chapter | Branch | The idea |
|---|---|---|
| 1 | `lesson-1` | A model only produces text |
| 2 | `lesson-2` | A tool: the model asks, our code runs it |
| 3 | `lesson-3` | The loop that makes it an agent |
| 4 | `lesson-4` | Tools that act, and asking a person first |
| 5 | `lesson-5` | Waiting, and carrying state between steps |
| 6 | `lesson-6` | Errors go back to the model |

## Setup

You need Node 18 or newer and two keys.

```bash
export ANTHROPIC_API_KEY=...   # your own key for the Claude API
export RAGA_API_KEY=...        # from the owner of Raga Radio; needed from chapter 4
```

Optional: `MODEL` picks the Claude model (default `claude-haiku-5-5`), and `RAGA_API_URL` points at a different Raga Radio server.

## How to follow along

```bash
git fetch origin
git checkout lesson-1            # go to a chapter
node agent-lesson/agent.js       # run it
git show origin/lesson-2         # read exactly what the next chapter changes
git checkout demo/simple-agent   # the finished agent, with all six commits
```

Each commit message explains the chapter in full: `git log demo/simple-agent`.

When the agent uses a tool it prints what the model asked for and what the code returned, so the conversation between the two is always visible.

## Chapter 1: a model only produces text

`agent.js` keeps a list called `messages`, sends the whole list to the model, prints the reply and appends it to the list.

Try:
- `What raga suits a rainy evening?` It answers from what it learned in training.
- `Make me a calm evening track.` It can describe one. It cannot make one.
- `What did I just ask you?` It knows, because the question is in `messages`. The model itself remembers nothing between requests.

Notice: a model can only write text. Everything an agent does comes from what we build around that.

## Chapter 2: a tool

The agent gets one tool, `pick_raga`, which looks up ragas for a time of day in Raga Radio.

A tool has two halves:
- for the model: a name, a description and the shape of the input (`tools`)
- for us: ordinary code that does the work (`handlers`)

Try:
- `Something peaceful for this evening.` Watch the two lines it prints: `model asks` and `we return`.
- `Hello!` No tool is called. The model decides when a tool is needed.
- Change the tool's description to something vague and ask again. The description is the only thing the model knows about the tool.

Notice: the model never runs anything. It writes a request and stops (`stop_reason` is `tool_use`). Our code runs the tool and sends the result back, and only then does the model answer.

## Chapter 3: the loop

Chapter 2 handled exactly one round of tool calls. Now `runTurn` keeps going: ask the model, run the tools it requests, send the results, ask again, until the model answers without requesting a tool. A second tool, `list_styles`, gives it something to chain.

Try:
- `I want something for a morning workout. What should it sound like?` It looks up ragas, looks up styles, then recommends. The step numbers show each trip to the model.
- `Compare what you would play at dawn and late at night.` It may call `pick_raga` twice in one step.

Notice: nobody wrote "first look up ragas, then styles". The model chose the order and the number of steps. That choice, repeated in a loop, is what "agent" means. `MAX_STEPS` is the brake.
