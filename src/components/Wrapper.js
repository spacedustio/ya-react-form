import React from 'react';
import { connect } from 'react-redux';
import { isFunction } from 'lodash';
import { addField, removeField, changeField } from '../redux/modules';
import storeShape from '../util/storeShape';
import FormRegistry from '../FormRegistry';

class Wrapper extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.store = props.store || context.store;
    this.getFormName = this.getFormName.bind(this);

    if (!this.props.component.props.name) {
      throw new Error('Must provide a name prop to your component.');
    }
  }
  componentWillMount() {
    const { name } = this.props.component.props; // eslint-disable-line react/prop-types
    const form = this.getFormName();
    // Create the field only if it doesn't exist in the form state
    if (!this.props.exists(form, name)) {
      this.store.dispatch(addField(form, name));
    }
  }
  componentWillUnmount() {
    if (this.context.yaForm.autoRemove) {
      const { name } = this.props.component.props; // eslint-disable-line react/prop-types
      const form = this.getFormName();
      // Hacky way to handle race condition of form being removed first resulting in the removal
      // of all the fields under it.
      try {
        this.store.dispatch(removeField(form, name));
      } catch (e) { // eslint-disable-line no-empty
      }
    }
  }
  getFormName() {
    if ((this.props.component.props.form === undefined
        || this.props.component.props.form.length === 0)
          && (this.context.yaForm.form === undefined || this.context.yaForm.form.length === 0)) {
      throw new Error('A form prop or a yaForm context must be provided to the wrapped component');
    }
    return this.props.component.props.form || this.context.yaForm.form;
  }
  render() {
    const {
      value, error, onChangeProp, errorProp, valueProp, onChange, valueTransform, component,
    } = this.props;
    const formName = this.getFormName();
    const { name } = component.props;
    const wrap = (handler, prop) => (...args) => {
      handler({
        store: this.store,
        formName,
        name,
        args: { ...args },
      });
      return isFunction(prop) ? prop(...args) : prop;
    };

    const newProps = {};

    if (onChangeProp) {
      newProps[onChangeProp] = wrap(onChange, component.props[onChangeProp]);
    }
    if (valueProp) {
      newProps[valueProp] = valueTransform(value(formName, name));
    }
    if (errorProp) {
      newProps[errorProp] = error(formName, name);
    }

    return React.cloneElement(component, newProps);
  }
}

Wrapper.propTypes = {
  store: storeShape,
  component: React.PropTypes.element.isRequired,
  onChangeProp: React.PropTypes.string,
  errorProp: React.PropTypes.string,
  valueProp: React.PropTypes.string,
  onChange: React.PropTypes.func,
  value: React.PropTypes.func,
  error: React.PropTypes.func,
  exists: React.PropTypes.func,
  valueTransform: React.PropTypes.func,
  errorTransform: React.PropTypes.func,
};

Wrapper.defaultProps = {
  valueTransform: (value) => value,
  errorTransform: (error) => error,
  onChange: ({ store, formName, name, args }) => {
    store.dispatch(
      changeField(formName, name, { value: args[0].target.value })
    );
  },
};

Wrapper.contextTypes = {
  store: storeShape,
  yaForm: React.PropTypes.object,
};

const mapStateToProps = (state) => ({
  value: (formName, name) => (
    state.yaForm[formName].fields.hasOwnProperty(name)
      ? state.yaForm[formName].fields[name].value
      : ''),
  error: (formName, name) => (
      state.yaForm[formName].fields.hasOwnProperty(name)
        ? state.yaForm[formName].fields[name].error
        : ''),
  exists: (formName, name) => state.yaForm[formName].fields.hasOwnProperty(name),
});

export default connect(mapStateToProps, null)(Wrapper);
