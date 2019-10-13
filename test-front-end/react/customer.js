/**
 * Created by OmotolaBabasola1 on 02/01/2019.
 */
'use strict';

function tick() {
    const element = (
        <div>
        <h1>Hello, world!</h1>
    <h2>It is {new Date().toLocaleTimeString()}.</h2>
    </div>
);
    ReactDOM.render(element, document.getElementById('root'));
}

setInterval(tick, 1000);
