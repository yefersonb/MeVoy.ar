import React from 'react';
import styles from './CozySpinner.module.css';

/*
    Basic, GPT-generated CozySpinner component. We gonna change it later...
    For now this is just a placeholder to ensure the spinner actually loads.
*/
export default function CozySpinner() {
    return (
        <div className={styles.spinnerContainer}>
            <div className={styles.spinner}>
                <div className={styles.doubleBounce1}></div>
                <div className={styles.doubleBounce2}></div>
            </div>
        </div>
    );
}
