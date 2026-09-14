# Florian's change requests, verbatim (from 2026-09-14 on)

Same authority as `00-REQUIREMENTS-VERBATIM.md`: **if the brief (`04-CR-BRIEF.md`) and this text
disagree, this text wins.** Where a change request here contradicts `00-REQUIREMENTS-VERBATIM.md`,
**the newer text here wins** (the conflict is named in `04-CR-BRIEF.md`).

Florian announced more change requests will follow. Each new one is appended below as its own
dated section, verbatim, and gets its own block of checklist rows in `04-CR-BRIEF.md` and
`PROGRESS.md`. Standing instruction for all of them (Florian, 2026-09-14): implement them **on the
Hetzner server, in good quality, with the same gauntlet loop technique** as the rest of this
workstream.

---

## CR-20260914 — Benchmarks tab as release-style comparison table, presets, accounts, mobile header, simple-mode sections, default sort

Reference image: `ops/ux-2026-09-12/assets/cr-20260914-benchmarks-table-reference.png`
(Florian's `./tmp/benchmarks-table.png`).

<requirements>

Let's change how the benchmarks tab shows up. When it opens, I want it to show a table like the typical benchmark comparison table that you get for new model releases. Find an example here: ./tmp/benchmarks-table.png (you can use a different style that fits or web app design, but so that you get the idea). Additionally, to the table, I want a chart - a bar chart, that shows all the models and the most important benchmark scores.

In this table we auto select the top 5 models from the filter selection and these are shown in the columns. The user must have an extremely convenient way to change the selection of compared models, basically I'd love to offer the user multiple options how to select that list and one of it should be a compination of our filter panel and the simple overview page pareto diagram with the sliders. The rows are all the different benchmarks. Let's list them by category. For example, all the coding benchmarks are next to each other, then all the general reasoning ones, then all the math ones, and so on. The cells should show the benchmark results, but also, like in Excel, add a data bar background (but subtle) so that it's visually more obvious which benchmark is performing better. Also, the winning one in each row should be shown with bold numbers in this cell so that it's visually clear which one is the winning one.
The benchmark names column (very left column) should have some tags, to clarify which are top benchmarks (e.g. the AA Index ones, the DesignArena ones, the very well known ones) and which ones are more niche, or cmomunity owned ones.

Let's make sure this table is extensive in the number of rows. We kind of want to show off how many benchmarks we have. For example, we should include the Artificial Intelligence Index, but also include all the individual benchmark result values. This index consists of a couple of results from artificial analysis, not only one or two, because we don't only show the index results but also the detailed results. Of course, each cell should be clickable and lead to a detailed comparison page where you can see where the number comes from and the source, and maybe the model and its other results.  Also there should be options to reduce the table to a selected list of benchmarks, including some presets like All, Important ones, etc (come up with good ideas) and user should also be able to configure and save these presets. We'll also need presets for model list. Also the filter options should have presets. For presets let's always offer some nice ideas from us + allow custom presets).
Let's also add sign in with google and store users and store their settings and presets in their user accounts, alternatively we only store in local storage, but then lets notify the user with a toast that we suggest signing in so that these presets aren't lost and synced across browsers.

This page really needs to look excellent and very intuitive.

Another thing that I noticed is: on the main page in simple mode, on a mobile portrait screen: in this header bar, we currently only show "Filters" and "Menu".
I would have liked to see the "Benchmarks" menu option there as well. Improve this. Maybe it's a good idea to rename "Menu" to "More" and left of it put the "Benchmarks" option.
And then maybe in the layout of simple mode let's make this landing page section that currently focuses on the simple Price/Capability focused overview (tracbars for min capability and max price, pareto diagram, overview table) only, consist of two sections: this Price/Capability overview and the Benchmarks section, which should show kind of a simple version of that Benchmark list. But let's also make clear to the user that this is the simple version and a more sophisticated version exists and the user can switch to that one (but that one maybe is better suited for desktop browsers than mobile browsers - maybe we should show a quick toast somewhere).

Also, I think the default sorting of the overview table of models should be: descending by score.

Make sure all these things are being implemented on the Hetzner server. You can use Claude Code with Opus 5 for that, optionally give the UI a quick design pass using Fable 5.1 but let's use Fable 5.1 sparingly as it consumes our token budget too fast. Make sure also Hermes knows about my recent changes. We will now add more change requests, and for all of these, make sure they are being implemented on the Hetzner server, in good quality, and with the same gauntlet loop technique that we are also using for the other things. When you start these new changes requests, take a look at what is currently running regarding benchmark heaven to make sure that stuff and the new change requests don't collide. You may stop the old agent and start a new one that finishes the old ones stuff but also knows about the new tasks, if you think that's a good idea.

</requirements>
