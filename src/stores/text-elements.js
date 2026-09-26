export default {
    en: {
        translation: {
            'language-name': 'english',
            toolbar: {
                run: "Run all code (ctrl+shift+enter)",
                upload: "upload to gallery",
                clear: "clear all",
                shuffle: "show random sketch",
                random: "make random change",
                "load-extension": "load library or extension",
                "show-info": "show info window",
                "hide-info": "hide info window"
            },
            info: {
                title: 'hydra',
                subtitle: 'live coding video synth (Noisemaker edition)',
                description: 'Noisemaker for Hydra is an experimental fork of the Hydra web editor. It runs in your browser and renders programs written in Polymorphic DSL with the Noisemaker shader engine.',
                'get-started-title': 'To get started:',
                'get-started-list': [
                    'Start your program with a search line listing the namespaces you use, for example: search hydra, synth',
                    'Change some numbers or effect names',
                    'Type Ctrl + Shift + Enter to evaluate. The program is saved into the page URL'
                ],
                'description-detailed': 'Programs here are written in Polymorphic DSL, not ordinary Hydra JavaScript. The first line is a search directive such as search hydra, synth that lists the namespaces the program uses. Chain generators and effects, write to an output with .write(o0), and show it with render(o0). A first program is: search hydra on the first line, then noise(scale: 5).write(o0) and render(o0), each on its own line. Hydra-style sketches such as osc().out() do not compile in this editor.',
                'uses': 'In this demo you can:',
                'uses-list': [
                    'create generative visuals with Hydra generators and the Noisemaker effect library',
                    'evaluate your program in the browser with Ctrl + Shift + Enter',
                    'preserve your work: every evaluation stores the program in the page URL for restoration and sharing',
                    'experiment with procedural and stateful effects such as particle flows',
                ],
                'author': 'Created by <a {{author}}>olivia.</a>',
                'more-info': 'For more information and instructions, see: <a {{docs}}>the interactive documentation</a>, <a {{functions}}>a list of hydra functions</a>, <a {{garden}}>the community database of projects and tutorials</a>, <a {{gallery}}>a gallery of user-generated sketches</a>, and <a {{repo}}>the source code on github</a>,',

                'more-info-forums': 'There is also an active <a {{discord}}>Discord server</a> and <a {{facebook}}>facebook group</a> for hydra users+contributors.',
                'support': 'If you enjoy using Hydra, please consider  <a {{open-collective}} >supporting continued development <3 </a>.'
            },
            extensions: {
                'about-extensions': 'Show community extensions for hydra-synth.',
                'show-example': 'Load and run {{extension-name}} example.',
                'show-library': 'Add code for loading {{extension-name}} to the top of the current sketch.',
                'show-docs': 'Documentation of usage for {{extension-name}}'
            }
        }
    }
}