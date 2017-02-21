import React from 'react';
import ReactDOM from 'react-dom';
import {Router, Route, IndexRedirect, browserHistory} from 'react-router';

const AppShell = (props) =>
    <div>
        <header>
            <a href='/page1'>Page 1</a>
            <a href='/page2'>Page 2</a>
        </header>
        <section>
            {props.children}
        </section>
    </div>;

const Page1 = () =>
    <h1>Page 1</h1>;

const Page2 = () =>
    <h1>Page 2</h1>;

const Routes = () =>
    <Router history={browserHistory}>
        <Route path='/' component={AppShell}>
            <IndexRedirect to='/page1' />
            <Route path='page1' component={Page1} />
            <Route path='page2' component={Page2} />
        </Route>
    </Router>;

global.main = (rootEl) =>
    ReactDOM.render(<Routes />, rootEl);
